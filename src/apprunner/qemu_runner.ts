import { QEMU_PATH } from '../constants';

import { execFile } from "child_process";
import fs from 'fs';

export interface QemuProcessInterface {
    run: () => void;
    setOnExit: (onExit: ((err?: Error) => void)) => void;
    kill: () => void;
}

export function start_qemu(executable: string, clock_shift: number=1) {
    return new Promise<QemuProcessInterface>((resolve, reject) => {
        let failed = false;
        let resolved_already = false;
        let _onExit: (err?: Error) => void;

        if(fs.existsSync("/dev/mqueue/qemu_rc")) fs.unlinkSync("/dev/mqueue/qemu_rc");

        let process = execFile(QEMU_PATH, [ "-machine", "LPC4088",
                                            "-kernel", executable,
                                            "-monitor",  "stdio",
                                            "-icount", `shift=${clock_shift},align=on,sleep=on`,
                                            "-s", "-S", "-singlestep" ]);
        process.stdout ? process.stdout.on("data", (chunk) => {
            console.log(`||QEMU.stdout||=> ${chunk.toString()}`);
        }) : null;
        process.stderr ? process.stderr.on("data", (chunk) => {
            console.log(`||QEMU.stderr||=> ${chunk.toString()}`);
        }) : null;
        process.on("message", (message) => {
            console.log(message);
        });
        process.on("exit", (code, signal) => {
            failed = true;
            if(resolved_already) {
                console.log(`QEMU exited with code ${code}`);
                if(_onExit !== undefined) _onExit();
            } else {
                reject(new Error(`QEMU exited with code ${code}`));
            }
        });
        process.on("error", (err: Error) => {
            failed = true;
            if(resolved_already) {
                if(_onExit !== undefined) _onExit(err);
            } else {
                reject(err);
            }
        });
        // Wait until QEMU opens the message queues
        console.log("Waiting for QEMU to open message queues");
        //while(!failed && !fs.existsSync("/dev/mqueue/qemu_rc"));
        if(!failed) {
            resolved_already = true;
            process.stdin ? process.stdin.write("logfile qemu.log\n") : undefined;
            resolve({
                run: () => process.stdin ? process.stdin.write("c\n") : undefined,
                setOnExit: (onExit: ((err?: Error) => void)) => {
                    _onExit = onExit;
                },
                kill: () => process.kill(),
            });
        }
    });
}