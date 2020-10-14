import fs from 'fs';
import { execute_commands, object_msg_handler, log_file_msg_handler } from '../apprunner/index';
import { QemuEventData } from '../receiver';


function LAB4() {
    const log_file_fd = fs.openSync("test_executables/LAB4/log.txt", 'w');

    const log_object: QemuEventData[] = [];

    execute_commands("test_executables/LAB4/testfile.txt",
            "test_executables/LAB4/LAB_004.axf",
            log_file_msg_handler(log_file_fd)).then(_ => {
        fs.closeSync(log_file_fd);
        process.exit(0);
    }, err => {
        console.error(err);
        process.exit(1);
    });
}

function LAB9() {
    const log_file_fd = fs.openSync("test_executables/LAB9/log.txt", 'w');

    const log_object: QemuEventData[] = [];

    execute_commands("test_executables/LAB9/testfile.txt",
            "test_executables/LAB9/LAB_009.axf",
            log_file_msg_handler(log_file_fd)).then(_ => {
        fs.closeSync(log_file_fd);
        process.exit(0);
    }, err => {
        console.error(err);
        process.exit(1);
    });
}

function LAB11() {
    const log_file_fd = fs.openSync("test_executables/LAB11/log.txt", 'w');

    const log_object: QemuEventData[] = [];

    execute_commands("test_executables/LAB11/testfile.txt",
            "test_executables/LAB11/LAB_011.axf",
            log_file_msg_handler(log_file_fd)).then(_ => {
        fs.closeSync(log_file_fd);
        process.exit(0);
    }, err => {
        console.error(err);
        process.exit(1);
    });
}

LAB11();