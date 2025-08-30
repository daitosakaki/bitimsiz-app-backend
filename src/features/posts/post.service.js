const { Storage } = require('@google-cloud/storage');
const httpStatus = require('http-status');
const Post = require('./post.model');
const User = require('../users/user.model');
const Follow = require('../users/follow.model');
const ApiError = require('../../utils/ApiError');
const { logger } = require('../../config/logger');
const { checkAndDecrementUsage } = require('../users/usage.service');
const mongoose = require('mongoose');

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

const generateUploadUrl = async (fileName) => {
    const options = { version: 'v4', action: 'write', expires: Date.now() + 15 * 60 * 1000, };
    const [url] = storage.bucket(bucketName).file(fileName).getSignedUrl(options);
    logger.info('Generated GCS signed URL', { fileName });
    return url;
};

const createPost = async (userId, postBody, reqMetadata) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

    await checkAndDecrementUsage(user, 'postShare');
    const postData = {
        ...postBody,
        author: userId,
        metadata: { ...postBody.metadata, ipAddress: reqMetadata.ip, deviceInfo: reqMetadata.userAgent },
    };
    const post = await Post.create(postData);

    // Yazarın kendi post sayısını artır
    await User.findByIdAndUpdate(userId, { $inc: { postCount: 1 } });

    // Eğer bu bir reply, quote veya repost ise, orijinal postun istatistiklerini güncelle.
    if (post.originalPost) {
        const updateField = `statistics.${post.type}Count`; // 'statistics.replyCount' gibi
        await Post.findByIdAndUpdate(post.originalPost, { $inc: { [updateField]: 1 } });
    }

    return post;
};

const getFeedForUser = async (userId, paginationOptions) => {
    const { limit = 10, page = 1 } = paginationOptions;
    const skip = (page - 1) * limit;
    // Aggregation pipeline'ında ObjectId olarak karşılaştırma yapmak önemlidir.
    const currentUserId = new mongoose.Types.ObjectId(String(userId));
    const posts = await Follow.aggregate([
        // 1. Adım: Mevcut kullanıcının onaylanmış ('approved') takiplerini bul.
        { $match: { follower: currentUserId, status: 'approved' } },

        // 2. Adım: Tüm takip edilen ID'lerini bir diziye topla ve kullanıcının kendi ID'sini de ekle.
        // Bu, tek bir "authorIds" dizisi oluşturur.
        { $group: { _id: null, followingIds: { $push: '$following' } } },
        { $project: { authorIds: { $setUnion: ['$followingIds', [currentUserId]] } } },

        // 3. Adım: 'posts' koleksiyonu ile birleştirme ($lookup).
        // Bu, SQL'deki LEFT JOIN'e benzer ve en kritik performans adımıdır.
        {
            $lookup: {
                from: 'posts', // Post'ların bulunduğu koleksiyonun adı
                let: { authorIds: '$authorIds' },
                pipeline: [
                    // Postları, oluşturduğumuz yazar ID'leri listesine göre filtrele
                    { $match: { $expr: { $in: ['$author', '$$authorIds'] } } },
                    // En yeniden eskiye doğru sırala
                    { $sort: { createdAt: -1 } },
                    // Sayfalama uygula
                    { $skip: skip },
                    { $limit: parseInt(limit, 10) },
                    // Her posta yazarının detay bilgisini ekle
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'author',
                            foreignField: '_id',
                            as: 'authorInfo', // 'author' alanı zaten var, çakışmasın diye 'authorInfo' yapıyoruz
                        },
                    },
                    // Yazar bilgisini bir dizi yerine obje yap ve sadece gerekli alanları seç
                    {
                        $addFields: {
                            author: {
                                $arrayElemAt: [
                                    {
                                        $map: {
                                            input: "$authorInfo",
                                            as: "user",
                                            in: {
                                                _id: "$$user._id",
                                                username: "$$user.username",
                                                displayName: "$$user.displayName",
                                                profileImageUrl: "$$user.profileImageUrl",
                                            }
                                        }
                                    }, 0
                                ]
                            }
                        }
                    },
                    { $project: { authorInfo: 0 } } // Geçici 'authorInfo' alanını kaldır
                ],
                as: 'posts', // Birleştirme sonucunda oluşan post dizisi
            },
        },

        // 4. Adım: Sonucu temizle, sadece post listesini döndür.
        { $unwind: '$posts' },
        { $replaceRoot: { newRoot: '$posts' } },
    ]);

    return posts;
};

const getPostById = async (postId, requestingUser) => {
    const post = await Post.findById(postId).populate('author', 'username displayName profileImageUrl isPrivate');
    if (!post) throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');

    if (post.author.isPrivate) {
        if (!requestingUser) throw new ApiError(httpStatus.UNAUTHORIZED, 'You must be logged in to view this post.');
        const isOwner = post.author.id === requestingUser.id;
        const isFollowing = await Follow.exists({ follower: requestingUser.id, following: post.author.id, status: 'approved' });
        if (!isOwner && !isFollowing) {
            throw new ApiError(httpStatus.FORBIDDEN, 'This account is private.');
        }
    }
    return post;
};

const deletePostById = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
    if (post.author.toString() !== userId) {
        logger.warn('Unauthorized attempt to delete post', { postId, attempterId: userId, authorId: post.author.toString() });
        throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to delete this post.');
    }
    await post.remove();
    await User.findByIdAndUpdate(userId, { $inc: { postCount: -1 } });
    // Not: GCS'den dosyaları silmek için burada bir kuyruk (queue) veya event tetiklenmelidir.
};

/**
 * Bir anket gönderisine oy verir.
 * @param {string} postId
 * @param {string} userId
 * @param {string} optionId - Oy verilecek seçeneğin ID'si
 * @returns {Promise<Post>}
 */
const voteOnPoll = async (postId, userId, optionId) => {
    const post = await Post.findById(postId);
    if (!post || !post.content.poll) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Poll not found.');
    }

    // Kullanıcının daha önce oy verdiği seçeneği bul ve oyunu kaldır ($pull)
    // Bu, kullanıcının fikrini değiştirmesini sağlar.
    await Post.updateOne(
        { _id: postId, 'content.poll.options.votes': userId },
        { $pull: { 'content.poll.options.$.votes': userId } }
    );

    // Kullanıcının yeni oyunu ekle ($addToSet)
    const updatedPost = await Post.findOneAndUpdate(
        { _id: postId, 'content.poll.options._id': optionId },
        { $addToSet: { 'content.poll.options.$.votes': userId } },
        { new: true } // Güncellenmiş belgeyi geri dön
    );

    logger.info('Vote cast on poll', { postId, userId, optionId });
    return updatedPost;
};

module.exports = { generateUploadUrl, createPost, getFeedForUser, getPostById, deletePostById, voteOnPoll };