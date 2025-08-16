/**
 * Uygulama genelinde standartlaştırılmış HTTP hataları oluşturmak için kullanılan özel Error sınıfı.
 * @extends Error
 */
class ApiError extends Error {
  /**
   * ApiError sınıfının yapıcı metodu.
   * @param {number} statusCode - HTTP durum kodu (örn: 404, 401, 500).
   * @param {string} message - İstemciye gösterilecek hata mesajı.
   * @param {boolean} [isOperational=true] - Bu hatanın operasyonel (beklenen) bir hata olup olmadığını belirtir.
   * Örneğin, kullanıcının yanlış şifre girmesi operasyonel bir hatadır.
   * Veritabanı bağlantısının kopması ise programatik bir hatadır.
   * @param {string} [stack=''] - Hatanın yığın izlemesi (stack trace).
   */
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;