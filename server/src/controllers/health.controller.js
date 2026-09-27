import * as healthService from '../services/health.service.js';

export const checkHealth = (req, res) => {
  const healthData = healthService.getHealthStatus();
  return res.status(200).json({
    success: true,
    data: healthData,
  });
};
