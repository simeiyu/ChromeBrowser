
this.addEventListener('message', function (e) {
  console.log('worker receive: ', e.data)
  this.postMessage('Good!')
  this.postMessage('Worker post message: ' + e.data)
}, false)
