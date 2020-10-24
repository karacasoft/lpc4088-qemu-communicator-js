import { execute_commands, log_file_msg_handler, CustomLogEvent } from '../apprunner/index';

import path from 'path';
import fs, { ReadStream } from 'fs';
import crypto from 'crypto';

const arg_len = process.argv.length;

function printUsage() {
    console.log(`   Usage:

${process.argv[0]} ${process.argv[1]} <directory to process>`);
}

async function sleep(ms: number) {
    return new Promise((resolve, reject) => {
        setTimeout(() => { resolve(); }, ms);
    });
}

async function runTestOnCode(test_file: string, code_file: string, log_file: string) {
    const log_file_fd = fs.openSync(log_file, "w");

    const custom_log_event_handler = (ev: CustomLogEvent) => {
        fs.writeSync(log_file_fd, `${Date.now()} LOG ${ev.text}\n`);
    }

    try {
        await execute_commands(test_file, code_file,
                log_file_msg_handler(log_file_fd),
                custom_log_event_handler);
    } catch(err) {
        // TODO print "good" error message
        console.log(err);
    }
    fs.closeSync(log_file_fd);
}

async function getHash(fstream: ReadStream) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("md5");
        hash.setEncoding("hex");

        fstream.on('error', err => reject(err));
        fstream.on('data', chunk => hash.update(chunk));
        fstream.on('end', () => {
            hash.end();
            resolve(hash.read());
        });
    });
}

async function studentBinaryCrosscheck(st1_bin: string, st2_bin: string) {
    const fstream1 = fs.createReadStream(st1_bin);
    const fstream2 = fs.createReadStream(st2_bin);

    const hash1 = await getHash(fstream1);
    const hash2 = await getHash(fstream2);

    fstream1.close();
    fstream2.close();

    return hash1 === hash2;
}

async function runStudentCodes(directory: string) {
    const st_list_file_name = path.join(directory, "student_list.txt");
    const st_list = fs.readFileSync(st_list_file_name).toString("utf8").split("\n");

    st_list.forEach(st1 => {
        st_list.forEach(st2 => {
            const st1_bin_path = path.join(directory, "code", st1, `${st1}.axf`);
            const st2_bin_path = path.join(directory, "code", st2, `${st2}.axf`);
            if(st1 !== st2) {
                if(fs.existsSync(st1_bin_path) &&
                        fs.existsSync(st2_bin_path)) {
                    studentBinaryCrosscheck(st1_bin_path, st2_bin_path).then(res => {
                        if(res) {
                            console.log(`${st1} and ${st2} binaries have the same hash value. Most probably copied binaries.`);
                        }
                    });
                    
                }

            }
        });
    });

    for(let test of fs.readdirSync(path.join(directory, "test_procedures"))) {
        for(let st of st_list) {
            const st_dir = path.join(directory, "code", st);
            const st_bin_path = path.join(st_dir, `${st}.axf`);
            const st_log_path = path.join(st_dir, `${st}.${test}.log`);
            if(fs.existsSync(st_bin_path)) {
                await runTestOnCode(
                    path.join(directory, "test_procedures", test),
                    st_bin_path,
                    st_log_path
                );
                await sleep(1000);
            }
        }
    }


    



}


if(arg_len !== 3) {
    printUsage();
} else {
    runStudentCodes(process.argv[2]);
}