# 深入浅出浏览器渲染原理
[ljianshu](https://github.com/ljianshu/Blog/issues/51)
理解浏览器渲染

> 浏览器的内核是指浏览器运行的最核心的程序，分为两部分：渲染引擎 和 JS引擎。渲染引擎在不同的浏览器中也不是都相同的。比如FireFox小红叫Gecko，Chrome和Safari中都是基于Webkit开发的。下面蛀牙介绍关于Webkit渲染引擎及相关问题。

### 浏览器渲染过程
浏览器渲染过程大致分为三个部分：
1. 浏览器会解析3个东西：
    - HTML/SVG/XHTML，Webkit有三个C++的类对应这三类文档。解析这三种文件会产生一个DOM Tree（DOM）。
    - CSS，解析CSS会产生CSS Ruler Tree（CSSOM）。
    - JavaScript脚本，主要通过DOM API和CSSOM API来操作DOM Tree和CSS Ruler Tree。
2. 解析完成后，浏览器引擎会通过DOM Tree和 CSS Ruler Tree 来构造 Rendering Tree。
    - Rendering Tree（渲染树）并不等同于DOM Tree，因为一些像 Header或 display: none 的东西就没必要放在渲染树中。
    - CSS Ruler Tree 主要是为了完成匹配并把CSS Ruler附加上 Rendering Tree上的每一个Element。
    - 然后，计算每个Frame（也就是每个Element）的位置，这叫 Layout 和 Reflow 过程。
3. 最后通过调用操作系统Native GUI 的API绘制。
    > 接下来针对这其中所经历的重要步骤，详细阐述。

#### 构建DOM
浏览器会遵守一套步骤将HTML文件转换为DOM数。宏观上，可以分为几个步骤：
字节数据 => 字符串 => Token => Node => DOM

- 浏览器从磁盘或网络读取HTML的原始字节，并根据文件的指定编码（如 UTF-8）将他们转换成字符串。
- 将字符串转换成Token，例如：` <html>`、` <body>`等。 **Token中会标识出当前Token是“开始标签”或是“结束标签”亦或是“文本”等信息**。
  > 例如： startTag: html  StartTag: head  StartTag: title  Hello EndTag: title  ... EndTag: html
- 生成节点对象并构建DOM
  > 事实上，构建DOM的过程中，不是等所有Token都转换完成后再去生成节点对象，而是一边生成Token一边消耗Token来生成节点对象。换句话说，每个Token被生成后，会立刻消耗这个Token创建出节点对象。**注意：带有结束标签标识的Token不会创建节点对象。**

#### 构建CSSOM
DOM会捕获页面的内容，但浏览器还需要知道页面如何展示，所以需要构建CSSOM。
构建CSSOM的过程与构建DOM的过程非常相似，当浏览器接收到一段CSS，浏览器首先要做的是识别出Token，然后构建节点并生成CSSOM。
在这一过程中，浏览器会确定下每一个节点的样式到底是什么，并且这一过程其实是很消耗资源的。因为样式你可以自行设置给某个节点，也可以通过继承获得。
在这一过程中，浏览器递归CSSOM树，然后确定具体的元素到底是什么样式。
  **注意：CSS匹配HTML元素是一个相当复杂和有性能问题的事情。所以，DOM树要小，CSS尽量用id和class，千万不要过渡层叠下去。**

#### 构建渲染树
当我们生成DOM树和CSSOM树以后，就需要将这两棵树组合为渲染树。
在这一过程中，不是简单的将两者合并就行了。**渲染树只会包括需要显示的节点和这些节点的样式信息**，如果某个节点是 `display: none`的，那么就不会在渲染树中显示。

#### 布局与绘制（layout paint)
当浏览器生成渲染树之后，就会根据渲染树来进行布局（也叫作回流reflow）。这一阶段浏览器要做的事情是要弄清楚各个节点在页面上的确切位置和大小。通常这一行为也被称为“自动重排”。
布局流程的输出时一个“盒模型”，它会精确地捕获每个元素在视口内的确切位置和尺寸，所有相对测量值都将转换为屏幕上的绝对像素。
布局完成后，浏览器会立即发出“Paint Setup”和“Paint”事件，将渲染树转换成屏幕上的像素。

------

### 相关问题

#### 渲染过程中遇到JS文件怎么处理？
JavaScript的加载、解析与执行会阻塞DOM的构建，即在构建DOM时，HTML解析器若遇到了JavaScript，它会暂停构建DOM，将控制权移交给JavaScript引擎，等JavaScript引擎运行完毕，浏览器再从中断的地方恢复DOM构建。
JS文件不只是阻塞DOM的构建，它会导致CSSOM也阻塞DOM的构建。
这是因为JavaScript不只是可以改DOM，还而已更改样式，即CSSOM。而不完整的CSSOM是无法使用的，但JavaScript中想访问并更改它，那么在执行JavaScript时，必须能拿到完整的CSSOM。所以，若浏览器尚未完成CSSOM的下载和构建，而我们却想在此时运行脚本，那么浏览器将延迟脚本执行和DOM构建，直至其完成CSSOM的下载和构建。也就是说，在这种情况下，浏览器会先下载和构建CSSOM，然后再执行JavaScript，最后再继续构建DOM。

#### 你真的了解回流（reflow)和重绘(repaint)吗？
当网页生成的时候，至少会渲染一次。而用户访问过程中，还会不断重新渲染。重新渲染会重复 reflow + repaint，或者只有 repaint。
  - 重绘： 当渲染树中的一些元素需要更新属性，而这些属性只是影响元素的外观、风格，而不会影响布局，如 background-color。
  - 回流： 当渲染树中的一部分（或全部）因为元素的规模尺寸、布局、隐藏等改变而需要重新构建时。
  **回流必定会重绘，重绘不一定会回流**
    回流所需的成本比重绘高很多，改变父节点里的子节点很可能导致父节点的一系列回流。
  1. 常见引起回流属性和方法
     任何会改变元素几何信息（位置、尺寸、大小）的操作，都会触发回流。
      - 添加或者删除可见的DOM元素；
      - 元素尺寸改变———边距、填充、边框、宽度和高度；
      - 内容变化，如用户在input中输入文字；
      - 浏览器窗口尺寸改变—— resize 事件发生时；
      - 计算offsetWidth 和 offsetHeight 属性；
      - 设置 style 属性的值；
     常见引起重排属性和方法：
        ```
        width          height          margin        padding
        display        border          position      overflow
        clientWidth    clientHeight    clientTop     clientLeft
        offsetWidth    offsetHeight    offsetTop     offsetLeft
        scrollWidth    scrollHeight    scrollTop     scrollLeft

        scrollIntoView()     scrollTo()     getComputedStyle()
        getBoundingClientRect()   scrollIntoViewlfNeeded()
        ```
  2. 常见引起重绘属性和方法：
        ```
        color              border-style             visibility             background
        text-decoration    background-image         background-position    background-repeat
        outline-color      outline                  outline-style          border-radius
        outline-width      box-shadow               background-size
        ```
  3. 如何减少回流、重绘
      - 使用 transform 替代 top
      - 使用visibility 替换 display:none
      - 不要把节点的属性值放在一个循环里当成循环里的变量
      ```
        for(let i = 0; i < 100; i++) {
          // 获取offsetTop会导致回流，因为需要去获取正确的值
          console.log(document.querySelector('.test').style.offsetTop)
        }
      ```
      - 不要使用table布局，可能很小的一个改动会造成整个table的重新布局
      - 动画实现的速度的选择，动画速度越快，回流次数越多，也可以选中使用requestAnimationFrame
      - CSS选择符从右往左匹配查找，避免节点层级过多
      - 将频繁重绘或者回流的节点设置为图层，图层能够阻止该节点的渲染行为影像别的节点。比如对于video标签来说，浏览器会自动将该节点变为图层。
    
#### async 和 defer 的作用是什么？有什么区别？
- 没有defer或async，浏览器会立即加载并执行指定的脚本，也就是说不等待后续载入的文档元素，读到就加载并执行。
- async属性表示异步执行引入的JavaScript，与defer的区别在于，如果已经加载好，就会开始执行————无论此刻是HTML解析阶段还是DOMContentLoaded触发之后。
  > 这种加载方式加载的JavaScript依然会阻塞load事件，即 async-script 可能在DOMContentLoaded触发之前或之后执行，但一定在load触发之前执行。
- defer表示延迟执行引入的JavaScript，即这段JavaScript加载时HTML并未停止解析，这两个过程是并行的。整个document解析完毕且defer-script也加载完成之后（这两件事情的顺序无关），会执行所有由defer-script加载的JavaScript代码，然后触发DOMCententLoaded事件。
*当 HTML 文档解析完成就会触发 [DOMContentLoaded](https://zhuanlan.zhihu.com/p/25876048)，而所有资源加载完成之后，load 事件才会被触发*

#### 为什么操作 DOM 慢？ 
  因为DOM 是属于渲染引擎中的东西，而JS又是JS引擎中的东西。当我们通过JS 操作DOM的时候，其实这个操作涉及到了两个线程之间的通信，那么势必会带来一些性能上的损耗。操作DOM的此时一多，就等于一直在进行线程之间的通信，并且操作DOM可能还会带来重绘回流的情况，所以也就导致了性能上的问题。

### 总结
  - 浏览器工作流程：构建DOM -> 构建CSSOM -> 构建渲染树 -> 布局 -> 绘制。
  - CSSOM会阻塞渲染，只有当CSSOM构建完毕后才会进入下一个阶段构建渲染树。
  - 通常情况下DOM和CSSOM是并行构建的，但是当浏览器遇到一个不带defer或async属性的script标签时，DOM构建将暂停，如果此时又恰巧浏览器尚未完成CSSOM的下载和构建，由于JavaScript可以修改CSSOM，所以需要等CSSOM构建完毕后再执行JS，最后才重新DOM构建
