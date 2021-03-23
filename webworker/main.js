const worker = new Worker('./worker.js')

worker.postMessage('hello world')
worker.onmessage = function (event) {
  console.log('Received Message ', event.data)
}
