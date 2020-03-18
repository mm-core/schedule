#!/usr/bin/env node
import invoke from '@mmstudio/invoke';
import { configure, getLogger } from 'log4js';
import schedule from 'node-schedule';
import uuid from 'uuid';
import config from '@mmstudio/config';

const logger = getLogger();

function init_schedule() {
	const jobs = config.jobs || [];
	jobs.forEach((job) => {
		const desc = JSON.stringify(job);
		logger.debug(`Waiting for schedule: ${desc}`);
		const { rule, start, end } = job;
		schedule.scheduleJob({
			end,
			rule,
			start
		}, async (dt) => {
			const actionid = uuid();
			const tm = new Date();
			logger.info(`Start schedule job:<${desc}>, actionid=${actionid}, which is supposed to run at:${dt.toUTCString()}, but actually ran at ${tm.toUTCString()}`);
			try {
				const ret = await invoke(job.service, job.data, actionid);
				const str = JSON.stringify(ret);
				logger.info(`Schedule job:<${desc}>, actionid=${actionid}, Result=${str}`);
			} catch (err) {
				logger.trace(err);
				const e_msg = err.message;
				logger.error(`Service Error:${e_msg}`, actionid);
			} finally {
				const cost = new Date().getTime() - tm.getTime();
				if (cost > 500) {
					logger.error(`Finish schedule job:${desc}, actionid = ${actionid},Costing ${cost}ms`);
				} else if (cost > 200) {
					logger.warn(`Finish schedule job:${desc}, actionid = ${actionid},Costing ${cost}ms`);
				} else {
					logger.info(`Finish schedule job:${desc}, actionid = ${actionid},Costing ${cost}ms`);
				}
			}
		});
	});
}

function main() {
	process.on('SIGINT', () => {
		process.exit(0);
	});

	configure('./log4js.json');
	logger.warn('Starting Node.js schedule service...........^v^');
	init_schedule();
	logger.warn('Node.js schedule service is started...........^v^');
}

main();
