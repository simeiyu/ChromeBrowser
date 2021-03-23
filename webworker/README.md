# JavaScript 多线程编程的前世今生 
[知乎](https://zhuanlan.zhihu.com/p/148447316)

## Web Worker
  Chrome 浏览器中每个 Tab 都是一个进程，每个进程都会有一个主线程，网页的渲染（Style, Layout, Paint, Composite）会在主线程进行操作。主线程可以发起多个 Web Worker，Web Worker 对应“线程”的概念。

### Web Worker 通信的效率与同步问题

主线程与 Web Worker 通过 postMessage(data: any) 通信的时候，data 会先被copy 一份再传给 Web Worker；
同样地，当 Web Worker  通过 postMessage(data: any) 与主线程通信的时候，data也会同样先被 copy 一份再传给主线程。

这样做显然会导致通信上的效率问题，试想一下你需要在 Web Worker 里面解压一个1G大小的问题，你需要吧整个1G的文件copy到Web Worker 里，Web Worker 解压完这个 1G文件后，再把解压完的文件copy回主线程里。

### SharedArrayBuffer
为了解决通信效率问题，浏览器提出了 ShareArrayBuffer，ShareArrayBuffer 基于ArrayBuffer 和 TypedArray API。
ArrayBuffer 对应一段内存（二进制内容），为了操作这段内存，浏览器要提供一些视图（Int8Array等），例如可以把这段内存当做每 8 位一个单元的 byte 数组，每 16 位一个单元的 16 位有符号数数组。

*注意：ArrayBuffer 中的二进制流被翻译成各种视图的时候采用小端还是大端是由即硬件决定的，绝大部分情况下是采用小端字节顺序*

!['什么“小端”、“大端”？？？'](https://ss0.bdstatic.com/70cFuHSh_Q1YnxGkpoWK1HF6hhy/it/u=4040463523,2146107919&fm=26&gp=0.jpg =100x100)


这段内存可以在不同的 Worker 之间共享，但是内存的共享又会产生另外的问题，也就是**竞争的问题**（race Conditions）：
计算机指令对内存操作进行运算的时候，我们可以看做分两步：
一是从内存中取值，
二是运算并给某段内存赋值。

当我们有两个线程对同一个内存地址进行 +1 操作的时候，假设线程是先后顺序运行的，为了简化模型，我们可以如下图表示：
![示意图](https://pic3.zhimg.com/80/v2-08e1199c5d22d824dc33b4ededf88d1a_720w.jpg)

上面两个线程的运行结果也符合我们的预期，即线程分别都对同一地址进行了 +1 操作，最后得到结果3。
但因为两个线程是同时运行的，往往会发生下图所表示的问题，即**读取与写入可能不在一个事务中发生**：
![示意图](https://pic1.zhimg.com/80/v2-7919e5412ac2c20a16e30f1650fb5988_720w.jpg)

### [Atomics](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics)
为了解决上述的竞争问题，浏览器提供了 Atomics API，这组 API 是一组原子操作，可以将读取和写入绑定起来，
例如下图中的 S1 到 S3 操作就被浏览器封装成 Atomics.add() 这个API，从而解决竞争问题。
[示意图]: https://pic3.zhimg.com/80/v2-94d9566ef28c4ea68cb6cf4a528bb51a_720w.jpg

Atomics API 具体包含：
1. **[Atomics.add()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/add)**
2. **[Atomics.and()]**()
2. **[Atomics.compareExchange()]**()
2. **[Atomics.exChange()]**()
2. **[Atomics.isLockFree()]**()
2. **[Atomics.load()]**()
2. **[Atomics.notify()]**()
2. **[Atomics.or()]**()
2. **[Atomics.store()]**()
2. **[Atomics.sub()]**()
2. **[Atomics.wait()]**()
2. **[Atomics.wor()]**()

### WebAssembly
有了ShareArrayBuffer 和 Atomics 能力之后，证明浏览器能够提供内存共享和锁的实现了，也就是说 WebAssembly 线程在浏览器机制上能够高效地得到保证。

