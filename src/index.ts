#!/usr/bin/env node
import 'anylogger-log4js';
import { configure } from 'log4js';
import schedule from 'node-schedule';
import config from '@mmstudio/config';
import anylogger from 'anylogger';
import dotenvLoad from 'dotenv-load';
import invoke from './invoke';

const logger = anylogger('@mmstudio/schedule');

interface IJob {
	service: string;
	description: string;
	rule: string;
	start: string | number;
	end: string | number;
	data: Record<string, unknown>;
}

function init_schedule() {
	const jobs = config.jobs as IJob[] || [];
	jobs.forEach((job) => {
		const desc = JSON.stringify(job);
		logger.debug(`Waiting for schedule: ${desc}`);
		const { rule, start, end } = job;
		schedule.scheduleJob({
			end,
			rule,
			start
		}, async (dt) => {
			const tm = new Date();
			logger.info(`Start schedule job:<${desc}>, which is supposed to run at:${dt.toUTCString()}, but actually ran at ${tm.toUTCString()}`);
			try {
				const ret = await invoke(job.service, job.data);
				const str = JSON.stringify(ret);
				logger.info(`Schedule job:<${desc}>, result=${str}`);
			} catch (err) {
				logger.trace(err);
				const e_msg = (err as Error).message;
				logger.error(`Service Error:${e_msg}`);
			} finally {
				const cost = new Date().getTime() - tm.getTime();
				if (cost > 500) {
					logger.error(`Finish schedule job:${desc},Costing ${cost}ms`);
				} else if (cost > 200) {
					logger.warn(`Finish schedule job:${desc},Costing ${cost}ms`);
				} else {
					logger.info(`Finish schedule job:${desc},Costing ${cost}ms`);
				}
			}
		});
	});
}

function main() {
	process.on('SIGINT', () => {
		process.exit(0);
	});

	dotenvLoad();
	configure('./log4js.json');
	logger.warn('Starting Node.js schedule service...........^v^');
	init_schedule();
	logger.warn('Node.js schedule service is started...........^v^');
}

main();
