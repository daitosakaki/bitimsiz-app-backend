const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const messageService = require('./message.service');

const reportMessage = catchAsync(async (req, res) => {
    const { reason } = req.body;
    await messageService.reportMessage(req.params.messageId, req.user.id, reason);
    res.status(httpStatus.CREATED).send({ message: 'Message has been reported successfully.' });
});

module.exports = { reportMessage };