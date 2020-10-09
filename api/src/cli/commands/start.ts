import knex from 'knex';
import logger from '../../logger';
import { Express } from 'express';

export default async function start() {
	const { default: env } = require('../../env');
	const database = require('../../database');
	const connection = database.default as knex;

	await database.validateDBConnection();

	const app: Express = require('../../app').default;

	const port = env.PORT;

	const server = app.listen(port, () => {
		logger.info(`Server started at port ${port}`);
	});

	// TBD:
	// - This should move to app.ts?
	// - What if we want to handle startup of Directus ourselves?
	//   - In that case we are also responsible of shutting it down, so this can't live there.
	//
	const signals: NodeJS.Signals[] = ['SIGHUP', 'SIGINT', 'SIGTERM'];
	signals.forEach((signal) => {
		process.on(signal, () =>
			server.close((err) => {
				if (err) {
					logger.error(`Failed to close server: ${err.message}`, {
						err,
					});
					process.exit(1);
				}
				logger.info('Server stopped.');

				// TBD:
				// - close database connection here instead of start.ts?
				connection
					.destroy()
					.then(() => {
						logger.info('Database connection stopped.');
						process.exit(0);
					})
					.catch((err) => {
						logger.info(`Failed to destroy database connections: ${err.message}`, {
							err,
						});
						process.exit(1);
					});
			})
		);
	});
}
