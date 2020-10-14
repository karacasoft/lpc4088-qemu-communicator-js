export type QemuMessage = QemuMessageGeneric & QemuMessageUsart;

export interface QemuMessageGeneric {
    magic: number;
    cmd: number;
    arg1: number;
    arg2: number;
    arg3: number;
    arg4: number;
    arg5: number;
    arg6: number;
}

export interface QemuMessageUsart {
    magic: number;
    cmd: number;
    arg1: number;
    chars?: string;
}

export type PortType = 0 | 1 | 2 | 3 | 4 | 5;
export type PinType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31;

export type TimerType = 0 | 1 | 2 | 3;

export type UsartType = 0 | 1 | 2 | 3 | 4;

export type PwmType = 0 | 1;

export function toPortType(inp: number): PortType | undefined {
    inp = Math.floor(inp);
    if(inp >= 0 && inp <= 5) {
        return inp as PortType;
    } else {
        return undefined;
    }
}

export function toPinType(inp: number): PinType | undefined {
    inp = Math.floor(inp);
    if(inp >= 0 && inp <= 31) {
        return inp as PinType;
    } else {
        return undefined;
    }
}

export function toTimerType(inp: number): TimerType | undefined {
    inp = Math.floor(inp);
    if(inp >= 0 && inp <= 3) {
        return inp as TimerType;
    } else {
        return undefined;
    }
}

export function toUsartType(inp: number): UsartType | undefined {
    inp = Math.floor(inp);
    if(inp >= 0 && inp <= 4) {
        return inp as UsartType;
    } else {
        return undefined;
    }
}

export function toPwmType(inp: number): PwmType | undefined {
    if(inp === 0) {
        return 0;
    } else if(inp === 1) {
        return 1;
    } else {
        return undefined;
    }
}