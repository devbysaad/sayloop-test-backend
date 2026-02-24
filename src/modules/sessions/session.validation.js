const { z } = require('zod');

const saveResultSchema = z.object({
  user1Id: z.number({ required_error: 'user1Id is required' }).int().positive(),
  user2Id: z.number({ required_error: 'user2Id is required' }).int().positive(),
  topic:   z.string({ required_error: 'topic is required' }).min(1).max(255),
  roomId:  z.string({ required_error: 'roomId is required' }).min(1),
  winner:  z.number().int().positive().optional().nullable(),
});

module.exports = { saveResultSchema };