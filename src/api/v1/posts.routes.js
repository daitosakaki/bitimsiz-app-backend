const express = require('express');
const auth = require('../../middlewares/auth.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const postController = require('../../features/posts/post.controller');
const { postValidation } = require('../../features/posts/post.validation');

const router = express.Router();

router.post(
    '/generate-upload-url',
    auth(),
    postController.generateUploadUrl
);

router.get(
    '/feed',
    auth(),
    postController.getFeed
);

router.post(
    '/',
    auth(),
    validate(postValidation.createPostSchema),
    postController.createPost
);

router.route('/:postId')
    .get(
        auth(),
        validate(postValidation.postIdSchema),
        postController.getPost
    )
    .delete(
        auth(),
        validate(postValidation.postIdSchema),
        postController.deletePost
    );

router.post(
    '/:postId/like',
    auth(),
    validate(postValidation.postIdSchema),
    postController.likePost
);

router.post(
    '/:postId/dislike',
    auth(),
    validate(postValidation.postIdSchema),
    postController.dislikePost
);

router.post(
    '/:postId/bookmark',
    auth(),
    validate(postValidation.postIdSchema),
    postController.bookmarkPost
);

router.post(
    '/:postId/report',
    auth(),
    validate(postValidation.reportPostSchema), // Artık çalışacak
    postController.reportPost
);

router.post(
    '/:postId/poll/vote',
    auth(),
    validate(postValidation.pollVoteSchema), // Artık çalışacak
    postController.voteOnPoll
);

module.exports = router;