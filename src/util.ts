import net from 'net';
// https://github.com/rocky/trepanjs/commit/f219410d72aba8cd4e91f31fea92a5a09c1d78f8
// Adding the license is required only if substantial portions of the software is copied
export const portInUse = function(port: number) {
    return new Promise<boolean>((resolve, reject) => {
        var server = net.createServer(function(socket) {
            socket.write('Echo server\r\n');
            socket.pipe(socket);
        });
    
        server.listen(port, '127.0.0.1');
    
        server.on('error', function (e) {
            resolve(true);
        });
    
        server.on('listening', function (_: any) {
            server.close();
            resolve(false);
        });
    });
    
};