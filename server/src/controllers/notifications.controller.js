const notificationsService = require('../services/notifications.service');
const { id } = require('../lib/params');

// POST /api/notifications/:id/read
async function markRead(req, res) {
  const notificationId = id(req.params.id);
  if (!notificationId) {
    return res.status(400).json({ error: 'Notification id must be a positive whole number' });
  }

  const updated = await notificationsService.markRead(notificationId);
  if (!updated) return res.status(404).json({ error: 'Notification not found' });

  res.json(updated);
}

module.exports = { markRead };
