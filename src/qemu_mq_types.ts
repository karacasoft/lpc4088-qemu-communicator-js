export interface QemuMessage {
    magic: number;
    cmd: number;
    arg1: number;
    arg2: number;
    arg3: number;
    arg4: number;
    arg5: number;
    arg6: number;
}