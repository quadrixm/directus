import { InvalidPayloadError } from '@directus/errors';
import type { RequestHandler } from 'express';
import Joi from 'joi';
import { sanitizeQuery } from '../utils/sanitize-query.js';
import { validateQuery } from '../utils/validate-query.js';

const validateBatchMiddleware =
	(scope: 'read' | 'update' | 'delete'): RequestHandler =>
	(req, _res, next) => {
		if (req.method.toLowerCase() === 'get') {
			req.body = {};
			return next();
		}

		if (req.method.toLowerCase() !== 'search' && scope !== 'read' && req.singleton) {
			return next();
		}

		if (!req.body) throw new InvalidPayloadError({ reason: 'Payload in body is required' });

		if (['update', 'delete'].includes(scope) && Array.isArray(req.body)) {
			return next();
		}

		// In reads, the query in the body should override the query params for searching
		if (scope === 'read' && req.body.query) {
			req.sanitizedQuery = sanitizeQuery(req.body.query, req.accountability);

			validateQuery(req.sanitizedQuery);
		}

		// Every cRUD action has either keys or query
		let batchSchema = Joi.object().keys({
			keys: Joi.array().items(Joi.alternatives(Joi.string(), Joi.number())),
			query: Joi.object().unknown(),
		});

		if (['update', 'delete'].includes(scope)) {
			batchSchema = batchSchema.xor('query', 'keys');
		}

		// In updates, we add a required `data` that holds the update payload if an array isn't used
		if (scope === 'update') {
			batchSchema = batchSchema.keys({
				data: Joi.object().unknown().required(),
			});
		}

		const { error } = batchSchema.validate(req.body);

		if (error) {
			throw new InvalidPayloadError({ reason: error.details[0]!.message });
		}

		return next();
	};

export default validateBatchMiddleware;
