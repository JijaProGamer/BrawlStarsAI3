const { spawn } = require('child_process');
const uuid = require("uuid")

const playerNetwork = require("./networks/player.js")

function sleep(ms) { return new Promise(r => setTimeout(r, ms))}

const resolution = [ 253, 120 ]

playerNetwork.makeModel(resolution).summary()

function StartRecorder(){
    return new Promise((resolve, reject) => {
        const appPath = `Phone-Recorder-${uuid.v4()}`
        const recorderCommand = [
            '--no-audio',
            '--render-driver=software',
            //`--max-size=${resolution.sort((a, b) => a - b)[1]}`,
            `--window-width=${resolution[0]}`,
            `--window-height=${resolution[1]}`,

            '--video-bit-rate=5000000', // 5mbps
            '--max-fps=5',

            //'--lock-video-orientation=90',
            //'--orientation=90',

            //'--display-buffer=50',
            '--window-borderless',
            '--disable-screensaver',

            '--forward-all-clicks',
            '--keyboard=uhid',
            '--mouse=uhid',

            `--window-title='${appPath}'`,
        ];
        
        const recorder = spawn('scrcpy', recorderCommand);
    
        recorder.stdout.on('data', (data) => {
            data = data.toString()
            let [_, metadata, value] = data.split(": ")

            console.log(data)
            if(metadata == "Texture"){
                let resolution = value.split("x").map((v) => parseInt(v))

                resolve({
                    appPath,
                    resolution
                })
            }
        });
        
        recorder.stderr.on('data', (data) => {
            console.error(data.toString());
        })
    })
}

function StartFFmpeg(recorderInfo){
    const ffmpegCommand = [
        '-f', 'gdigrab',
        '-framerate', '7',
        '-r', '7',
        '-s', `${resolution[0]}x${resolution[1]}`,
        '-i', `title='${recorderInfo.appPath}'`,
        '-vf', 'format=rgba',
        '-c:v', 'rawvideo',
        '-f', 'rawvideo',
        '-',
        //'test.bin'
    ];
    
    const ffmpeg = spawn('ffmpeg', ffmpegCommand);

    let bytesWritten = 0;
    const imageBuffer = Buffer.allocUnsafe(resolution[0] * resolution[1] * 4);

    let frameIndex = 0;

    ffmpeg.stdout.on('data', (data) => {
        const remainingBytes = imageBuffer.length - bytesWritten;
    
        if (remainingBytes >= data.length) {
            data.copy(imageBuffer, bytesWritten);
            bytesWritten += data.length;
        } else {
            data.copy(imageBuffer, bytesWritten, 0, remainingBytes);
    
            processFrame(imageBuffer, frameIndex);
            frameIndex++;
    
            const remainingDataLength = data.length - remainingBytes;
            data.copy(imageBuffer, 0, remainingBytes, remainingDataLength);
    
            bytesWritten = remainingDataLength;
        }
    });
    
    /*ffmpeg.stderr.on('data', (data) => {
        console.error(`ffmpeg stderr: ${data}`);
    });*/
    
    /*ffmpeg.on('error', (err) => {
        console.error('Failed to start ffmpeg process.', err);
    });
    
    ffmpeg.on('exit', (code, signal) => {
        console.log(`ffmpeg process exited with code ${code} and signal ${signal}`);
    });*/
}

(async () => {
    let recorderInfo = await StartRecorder()
    await sleep(1000)

    let recorderProcesser = await StartFFmpeg(recorderInfo)
})()

const secondsPerFrame = 1
let lastSecondProcessed = Date.now() - 1000 * secondsPerFrame

let fs = require("fs")
function processFrame(imageBuffer, frameIndex) { 
    if((Date.now() - lastSecondProcessed) / 1000 < secondsPerFrame)
        return;

    let pixelArray = parseRawVideoData(imageBuffer)
    lastSecondProcessed = Date.now()
    
    let ppmData = `P3\n${resolution[0]} ${resolution[1]}\n255\n`;
    for(let pixel of pixelArray){
        ppmData += `${pixel[0]} 0 ${pixel[1]} `;
    }

    fs.writeFile(`./training_data/brawler_identification/output${frameIndex}.ppm`, ppmData, 'utf8', () => {});
}

function parseRawVideoData(data) {
    const pixels = [];

    for (let i = 0; i < data.length; i += 4) {
        const red = data.readUInt8(i);
        //const green = data.readUInt8(i + 1);
        const blue = data.readUInt8(i + 2);

        pixels.push([red, blue]);
    } 

    return pixels;
}