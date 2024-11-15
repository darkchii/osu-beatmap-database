const mysql = require('mysql');
const util = require('util');
const fetch = require('node-fetch');
const cors = require('cors');
const { text } = require('body-parser')
const fs = require('fs');
const crypto = require('crypto');
const child_process = require('child_process');
const polka = require('polka');
const path = require('path');
const send = require('@polka/send-type');

const config = require('../config.json');

const connection = mysql.createPool(config.MYSQL);
const runSql = util.promisify(connection.query).bind(connection);
const exec = util.promisify(child_process.exec);

const sleep = delay => new Promise((resolve) => setTimeout(resolve, delay))

const DEBUG_DO_NOT_INSERT = false;

const DIFFICULTY_ATTRIBS = {
    1: 'aim',
    3: 'speed',
    5: 'od',
    7: 'ar',
    9: 'max_combo',
    11: 'total',
    13: 'hit_window_300',
    15: 'score_multiplier',
    17: 'flashlight_rating',
    19: 'slider_factor',
    21: 'speed_note_count'
};

const exists = async path => {
    try {
        await fs.promises.access(path, fs.constants.F_OK);

        return true;
    } catch (e) {
        return false;
    }
};

function md5(path) {
    return new Promise((resolve, reject) => {
        const output = crypto.createHash('md5');

        if (typeof path == 'string') {
            const input = fs.createReadStream(path);

            input.on('error', (err) => {
                reject(err);
            });

            output.once('readable', () => {
                resolve(output.read().toString('hex'));
            });

            input.pipe(output);
        } else {
            resolve(output.update(path).digest('hex'));
        }
    });
}

async function upsertBeatmap(b, diffcalc = false, index = 0, total = 0) {
    const values = [b.beatmap_id, b.beatmapset_id, b.approved, b.total_length, b.hit_length,
    b.version, b.artist, b.title, b.creator, b.creator_id, b.mode, b.diff_size,
    b.diff_overall, b.diff_approach, b.diff_drain, b.approved_date, b.last_update,
    Math.min(2147483647, b.bpm), b.source, b.tags, b.genre_id, b.language_id, b.max_combo,
    b.difficultyrating, b.favourite_count, b.playcount, b.passcount,
    b.count_normal, b.count_slider, b.count_spinner, Number(b.count_normal) + Number(b.count_slider) + Number(b.count_spinner), b.submit_date, b.packs || '',
    b.rating, b.storyboard, b.video, b.download_unavailable, b.audio_unavailable, b.file_md5
    ];

    const query = `
        INSERT INTO beatmap
           (beatmap_id, beatmapset_id, approved, total_length, hit_length,
            version, artist, title, creator, creator_id, mode, cs, od, ar, hp,
            approved_date, last_updated_date, bpm, source, tags, genre_id,
            language_id, max_combo, star_rating, favorites, plays, passes,
            num_circles, num_sliders, num_spinners, hit_objects, submitted_date, packs,
            rating, storyboard, video, download_unavailable, audio_unavailable, file_md5
        )
        VALUES
            (${"?, ".repeat(values.length - 1)}?)
        ON DUPLICATE KEY UPDATE
            beatmap_id = ?, beatmapset_id = ?, approved = ?, total_length = ?, hit_length = ?,
            version = ?, artist = ?, title = ?, creator = ?, creator_id = ?, mode = ?, cs = ?, od = ?, ar = ?, hp = ?,
            approved_date = ?, last_updated_date = ?, bpm = ?, source = ?, tags = ?, genre_id = ?,
            language_id = ?, max_combo = ?, star_rating = ?, favorites = ?, plays = ?, passes = ?,
            num_circles = ?, num_sliders = ?, num_spinners = ?, hit_objects = ?, submitted_date = ?, packs = ?,
            rating = ?, storyboard = ?, video = ?, download_unavailable = ?, audio_unavailable = ?, file_md5 = ?
    `;

    if (!DEBUG_DO_NOT_INSERT) {
        await runSql(query,
            [...values, ...values]);
    }

    if(b.approved <= 0){
        console.log(`(${index+1}/${total}) ${b.beatmap_id} has no leaderboard, skipping`);
        return false;
    }

    const osuPath = path.resolve(config.OSU_FILES_PATH, `${b.beatmap_id}.osu`);

    if (!(await exists(osuPath)) || diffcalc || await md5(osuPath) != b.file_md5) {
        let attempts = 0;
        do {
            const beatmapFile = await fetch(`https://osu.ppy.sh/osu/${b.beatmap_id}`);
            const buf = await beatmapFile.buffer();

            const _md5 = await md5(buf);

            // console.log('()id: '+b.beatmap_id+' - md5 compare', _md5, b.file_md5, 'attempt', attempts);
            console.log(`(${index+1}/${total}) id: ${b.beatmap_id} - md5 compare`, _md5, b.file_md5, 'attempt', attempts);

            if (_md5 == b.file_md5) {
                await fs.promises.writeFile(osuPath, buf);
                break;
            }

            attempts++;

            await sleep(2500);
        } while (true);

        const worker = child_process.fork(path.resolve(__dirname, 'beatmap-processor.js'));

        worker.send({
            beatmap_path: osuPath,
            beatmap_id: b.beatmap_id
        });
    } else {
        // console.log(b.beatmap_id, 'exists');
        console.log(`(${index+1}/${total}) ${b.beatmap_id} exists, no need to download`);
    }

    return true;
}

async function upsertBeatmaps(beatmaps, diffcalc = false) {
    console.log('starting batch of ' + beatmaps.length + ' beatmaps');
    let ids = [];
    let index = 0;
    for await (const beatmap of beatmaps) {
        try{
            const process = await upsertBeatmap(beatmap, diffcalc, index, beatmaps.length);
            if(process)
                ids.push(beatmap.beatmap_id);
        }catch(err){
            console.error(err);
        }
        index++;
    }

    if (ids.length > 0) {
        const str_ids = ids.join(' ');

        const RUN_DRY = false;
        const ALLOW_DL = false;
        const THREADS = 6;

        let _exec_win = `set ALLOW_DOWNLOAD=${ALLOW_DL ? '1' : '0'} && set INSERT_BEATMAPS=0 && set SKIP_INSERT_ATTRIBUTES=0 && set DB_USER=${config.MYSQL.user} && set DB_HOST=${config.MYSQL.host} && set DB_PASS=${config.MYSQL.password} && set DB_NAME=${config.MYSQL.database} && set BEATMAPS_PATH=${config.OSU_FILES_PATH} && dotnet ${config.OSU_DIFFCALC_PATH} beatmaps -ac -c ${THREADS} ${RUN_DRY ? "-dry" : ""} ${str_ids}`;
        let _exec_linux = `export ALLOW_DOWNLOAD=${ALLOW_DL ? 'true' : 'false'} && set INSERT_BEATMAPS=false && export SKIP_INSERT_ATTRIBUTES=false && export DB_USER=${config.MYSQL.user} && export DB_HOST=${config.MYSQL.host} && export DB_PASS=${config.MYSQL.password} && export DB_NAME=${config.MYSQL.database} && export BEATMAPS_PATH=${config.OSU_FILES_PATH} && dotnet ${config.OSU_DIFFCALC_PATH} beatmaps -ac -c ${THREADS} ${RUN_DRY ? "-dry" : ""} ${str_ids}`;

        console.time('ran diffcalc on ' + ids.length + ' beatmaps');
        console.log('executing diffcalc on ' + ids.length + ' beatmaps');
        const __exec = await exec(_exec_linux);
        console.timeEnd('ran diffcalc on ' + ids.length + ' beatmaps');
    }
    console.log('finished batch of ' + beatmaps.length + ' beatmaps');
}

async function updateBeatmap(beatmap_id, diffcalc = false) {
    try {
        const response = await fetch(`https://osu.ppy.sh/api/get_beatmaps?k=${config.OSU_API_KEY}&b=${beatmap_id}`);
        const beatmaps = await response.json();

        // for(const beatmap of beatmaps)
        await upsertBeatmaps(beatmaps, diffcalc);
        // for await (const beatmap of beatmaps) {
        //     await upsertBeatmap(beatmap, diffcalc);
        // }
    } catch (e) {
        console.error(e);

        return false;
    }
}

async function updateBeatmaps() {
    try {
        const query = `SELECT * FROM beatmap WHERE approved > 0 ORDER BY approved_date DESC LIMIT 1;`;

        const results = await runSql(query);

        let sinceDate = "2007-01-01";

        if (results.length > 0)
            sinceDate = results[0].approved_date.toISOString();

        const response = await fetch(`https://osu.ppy.sh/api/get_beatmaps?k=${config.OSU_API_KEY}&since=${sinceDate}`);
        const beatmaps = await response.json();

        await upsertBeatmaps(beatmaps);

        if (beatmaps.length == 500)
            await updateBeatmaps();
    } catch (e) {
        console.error(e);
    }
}

async function init() {
    await fs.promises.mkdir(config.OSU_FILES_PATH, { recursive: true });

    // updateBeatmaps();
    // setInterval(updateBeatmaps, 60 * 1000);
    //await instead, to avoid the setInterval so they don't start running in parallel
    await updateBeatmaps();

    // //the interval, but await it,
    //15 minutes
    const min_wait = 60 * 15; //15 minutes
    while(true){
        const start = Date.now();
        await updateBeatmaps();
        const end = Date.now();
        const duration = end - start;

        // if(duration < 60000)
        //     await sleep(60000 - duration); //make sure atleast 1 minute passes before the next update (if we fast as f)
        if(duration < min_wait * 1000)
            await sleep(min_wait * 1000 - duration); //make sure atleast 5 seconds passes before the next update (if we fast as
    }
}

init().catch(console.error);

polka()
    .use(cors())
    .use(text({ type: 'text/plain' }))
    .all('/b/:id?', async (req, res) => {
        const userMode = Number(req.query.mode);
        const mode = userMode >= 0 && userMode <= 3 ? userMode : 0;

        const beatmaps = [];

        const ids = req.params.id != null ? req.params.id : req.body;

        for (const id of ids.split(',')) {
            const query = 'SELECT * FROM beatmap WHERE beatmap_id = ?';

            let results = await runSql(query, [id]);

            if (results.length == 0) {
                await updateBeatmap(id);

                results = await runSql(query, [id]);
            }

            if (results.length == 0)
                continue;

            const response = {
                beatmap: results[0],
                difficulty: {}
            };

            let beatmapMode = response.beatmap.mode > 0 ? response.beatmap.mode : mode;

            const diffsQuery = 'SELECT * FROM osu_beatmap_difficulty_attribs WHERE beatmap_id = ? AND mode = ?';

            let diffs = await runSql(diffsQuery, [id, beatmapMode]);

            if (diffs.length == 0) {
                await updateBeatmap(id, true);

                diffs = await runSql(diffsQuery, [id, beatmapMode]);
            }

            for (const diff of diffs) {
                if (!response.difficulty.hasOwnProperty(diff.mods))
                    response.difficulty[diff.mods] = {};

                response.difficulty[diff.mods][DIFFICULTY_ATTRIBS[diff.attrib_id]] = diff.value;
            }

            beatmaps.push(response);
        }

        if (beatmaps.length == 0)
            send(res, 404, { error: 'beatmap not found' });
        else if (beatmaps.length == 1)
            send(res, 200, beatmaps[0]);
        else
            send(res, 200, beatmaps);
    })
    .get('/beatmaps', async (req, res) => {
        const userMode = Number(req.query.mode);
        const mode = userMode >= 0 && userMode <= 3 ? userMode : 0;
        const params = [mode];

        const query = 'SELECT beatmap_id, approved FROM beatmap WHERE approved > 0';

        let filter = 'AND mode = ?';

        if (req.query.from) {
            filter += ` AND approved_date > ?`;
            params.push(new Date(req.query.from).toISOString().slice(0, 19).replace('T', ' '));
        }

        if (req.query.to) {
            filter += ` AND approved_date < ?`;
            params.push(new Date(req.query.to).toISOString().slice(0, 19).replace('T', ' '));
        }

        if (req.query.star_rating) {
            let star_range = req.query.star_rating.split("-");

            const range = [];

            for (const part of star_range)
                range.push(parseFloat(part));

            if (range.length == 1)
                range.push(Math.floor(range[0] + 1));

            filter += ` AND star_rating BETWEEN ? and ?`;

            params.push(range[0], range[1]);
        }

        if (req.query.tags) {
            let tags = req.query.tags.replace(',', '%')
            filter += ` AND CONCAT(source, '|', tags, '|', artist, '|', title, '|', creator, '|', version) like ?`;
            params.push('%' + tags + '%');
        }

        const beatmaps = await runSql(`${query} ${filter}`, params);

        const latestRanked = await runSql(
            `SELECT beatmapset_id FROM beatmap WHERE approved >= 1 AND approved <= 2 ${filter}
            ORDER BY approved_date DESC, beatmapset_id DESC LIMIT 1`,
            params
        );

        const latestQualified = await runSql(
            `SELECT beatmapset_id FROM beatmap WHERE approved = 3 ${filter}
            ORDER BY approved_date DESC, beatmapset_id DESC LIMIT 1`,
            params
        );

        const latestLoved = await runSql(
            `SELECT beatmapset_id FROM beatmap WHERE approved = 4 ${filter}
            ORDER BY approved_date DESC, beatmapset_id DESC LIMIT 1`,
            params
        );

        const latestRankedSet = latestRanked.length > 0 ? await runSql(`SELECT * FROM beatmap WHERE beatmapset_id = ? ${filter}`, [latestRanked[0].beatmapset_id, ...params]) : null;
        const latestQualifiedSet = latestQualified.length > 0 ? await runSql(`SELECT * FROM beatmap WHERE beatmapset_id = ? ${filter}`, [latestQualified[0].beatmapset_id, ...params]) : null;
        const latestLovedSet = latestLoved.length > 0 ? await runSql(`SELECT * FROM beatmap WHERE beatmapset_id = ? ${filter}`, [latestLoved[0].beatmapset_id, ...params]) : null;

        const rankedMaps = beatmaps.filter(a => [1, 2].includes(a.approved));
        const qualifiedMaps = beatmaps.filter(a => a.approved == 3);
        const lovedMaps = beatmaps.filter(a => a.approved == 4);

        const response = {
            ranked: {
                amount: rankedMaps.length,
                latest: latestRankedSet,
                beatmaps: rankedMaps.map(a => a.beatmap_id)
            },
            qualified: {
                amount: qualifiedMaps.length,
                latest: latestQualifiedSet,
                beatmaps: qualifiedMaps.map(a => a.beatmap_id)
            },
            loved: {
                amount: lovedMaps.length,
                latest: latestLovedSet,
                beatmaps: lovedMaps.map(a => a.beatmap_id)
            },
        };

        send(res, 200, response);
    })
    .listen(config.HTTP_PORT || 16791, err => {
        if (err) throw err;

        console.log(`> Running on localhost:${config.HTTP_PORT || 16791}`);
    });
