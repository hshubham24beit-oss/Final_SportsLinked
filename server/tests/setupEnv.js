process.env.NODE_ENV = 'test';
process.env.PORT = '5050';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/sportlinked_test_placeholder';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), 'sportlinked-test-uploads');
process.env.PRIVATE_UPLOAD_DIR = require('path').join(
  require('os').tmpdir(),
  'sportlinked-test-private-uploads',
);
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789-0123456789-abcdef';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-9876543210-9876543210-abcdef';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.COOKIE_NAME = 'sportlinked_refresh';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.COOKIE_SECURE = 'false';
process.env.MAIL_FROM = 'SportLinked Test <no-reply@test.local>';
process.env.SMTP_HOST = '';
process.env.ADMIN_EMAIL = 'admin@sportlinked.test';
process.env.ADMIN_PASSWORD = 'AdminPass123';
