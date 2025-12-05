const isDevelopment = () => process.env.LOCAL_MODE === 'true' || process.env.REDDIT_MODE === 'true';

export { isDevelopment };
