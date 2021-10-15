![Simple 15 puzzle game javascript HTML](https://repository-images.githubusercontent.com/387269543/be595743-c52e-41f0-a40c-3cedce7908a1)

# Simple 15 puzzle game for HTML 

A simple implementation of the classic mini-game Fifteen Sliding Puzzle, using HTML DOM document elements and without using Canvas or third party libraries. 

When mixing a picture, random replacement of slots is not used, only natural mixing by moving a free slot, thanks to this, an error is excluded, due to which the puzzle may not be assembled.

By solving the puzzle, you can move several blocks in a column and a row in one move. 

The engine code is very flexible for modifications, has many settings and can be integrated into any web page or web app.

To use it, you need to create a div element with ID "fifteen" and add an array with parameters, the script will do the rest itself. The script is very simple and you can easily add this mini-game to your web page.

Editor: https://kirilllive.github.io/Fifteen_puzzle/

Demo: https://kirilllive.github.io/Fifteen_puzzle/example.html

itch.io: https://kirill-live.itch.io/fifteen-puzzle

Twitter: https://twitter.com/TuesdayJS_vn

[![Patreon](http://odin-interactive.com/img/patron.svg)](https://www.patreon.com/kirill_live)

# Structure

```html
<html>
    <head>
    </head>
    <body>
        <div id='fifteen'></div> <!--element "fifteen" in which the game will take place-->
        <script>
        var setup={
             puzzle_fifteen:{
                diff:300, // number of movements of the slots for shuffling pictures
                size:[512,640], // element size "fifteen" in pixels only
                grid:[3,3], // the number of squares in the height and width of the picture
                fill:true, // Stretching the area with the game to fit the element is recommended for fullscreen
                number:true, // Slot sequence number
                art:{
                    url:"art.jpg", // path to the picture (you can use any format of supported browsers, gif-animation and svg)
                    ratio:false // enlarge the picture in height or width
                },
                // optional elements
                time:"0.1", // block move animation time
                style:"border-radius:12px;" // style for puzzle square
             }
        }
        </script>
        <script src="fifteen_puzzle.js"></script> <!--path to file engine-->
    </body>
</html>
```

# Editor / Demo

You can upload your image, set parameters and generate an html file with the game and your image. You can use the resulting file on your website or directly on your device, or you can modify it yourself, change the parameters, or write your own script that will run after the game is finished.

Editor: https://kirilllive.github.io/Fifteen_puzzle/

Demo: https://kirilllive.github.io/Fifteen_puzzle/example.html

[![Patreon](screenshot.jpg)](https://kirilllive.github.io/Fifteen_puzzle/)
