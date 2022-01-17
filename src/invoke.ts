import { constants, promises as fs } from 'fs';
import { join } from 'path';
import anylogger from 'anylogger';

const logger = anylogger('@mmstudio/schedule/invoke');

async function resolve_path(file_name: string, path: string) {
	// !!! We could not use require.resolve here, because electron does not support.
	const full_path = join(path, `${file_name}.js`);
	await fs.access(full_path, constants.R_OK);
	return full_path;
}

const cwd = process.cwd();
const debug = process.env.NODE_ENV === 'development'; // production

export default async function invoke<T>(service: string, content: unknown) {
	const tm = new Date().getTime();
	logger.info(`Begin dealing message, service=${service}`);
	const body = JSON.stringify(content);
	try {
		logger.debug(`Begin dealing message, body=${body}`);
		const file_name = service;
		logger.debug(`trying get service file:${file_name}`);
		const path = await (async () => {
			try {
				// !!! await added here to get exception
				return await resolve_path(file_name, join(cwd, 'dist', 'schedule'));
			} catch (error) {
				logger.trace(error);
				logger.error(`Could not load service:${file_name}`);
				throw new Error(`Could not load service:${file_name}`);
			}
		})();
		if (debug) {
			delete (require.cache as { [key: string]: unknown; })[path];
		} 
		// eslint-disable-next-line @typescript-eslint/no-var-requires,import/no-dynamic-require
		const atom = (require(path) as { default(c: unknown): Promise<T>; });
		return await atom.default(content);
	} catch (e) {
		const err = e as Error;
		logger.trace(err);
		const err_msg = err.message;
		logger.error(`Service Error:${err_msg},`);
		throw new Error(err_msg);
	} finally {
		const cost = new Date().getTime() - tm;
		logger.debug(`End dealing service:${service}, Message body=[${body}], ${cost}ms cost`);
		if (cost > 500) {
			logger.error(`Service cost ${cost} ms, please check the service! Message body=[${body}]`);
		} else if (cost > 200) {
			logger.warn(`Service cost ${cost} ms, maybe you should please check the service! Message body=[${body}]`);
		}
	}
}
