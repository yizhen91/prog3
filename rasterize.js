/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog3/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/spheres.json"; // spheres file loc
var ViewUp = new vec3.fromValues(0,1,0);
var LookAt = new vec3.fromValues(0,0,1);
var LightLoc = new vec4.fromValues(-3,1,-0.5,1.0);
var LightCol = new vec4.fromValues(1.0,1.0,1.0,1.0);
var EyeLoc = new vec4.fromValues(0.5, 0.5, -0.5, 1.0);

var complete_set = [];

var pressedKey = [];

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize = 0; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader

var translateMatrix = mat4.create();
var rotateMatrix = mat4.create();

var viewMatrix = mat4.create();
var perspMatrix = mat4.create();
var modelMatrix = mat4.create();

//color position attribute
var diffusePositionAttrib;
var ambientPositionAttrib;
var specularPositionAttrib;
var nPositionAttrib;
var normalPositionAttrib;

//uniform variables
var uniformViewMat;
var uniformPersMat;
var uniformModelMat;
var uniformLightLoc;
var uniformLightCol;
var uniformEyeLoc;

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response);
        } // end if good params
    } // end try

    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it

    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try

    catch(e) {
      console.log(e);
    } // end catch

} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles() {
  var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");
  if (inputTriangles != String.null)
  {
    var whichSetVert; // index of vertex in current triangle set
    var whichSetTri; // index of triangle in current triangle set
    //var coordArray = []; // 1D array of vertex coords for WebGL

    var vtxBufferSize = 0; // the number of vertices in the vertex buffer
    var indexOffset = vec3.create(); // the index offset for the current set

    for (var whichSet=0; whichSet<inputTriangles.length; whichSet++)
    {
      vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset

      var triangle_gp = {};
      triangle_gp.triBufferSize = 0;
      triangle_gp.diffuseArray = [];
      triangle_gp.ambientArray = [];
      triangle_gp.specularArray = [];
      triangle_gp.nValueArray = [];
      triangle_gp.normalArray = [];
      triangle_gp.coordArray = [];
      triangle_gp.indexArray = [];

      // set up the vertex coord array
      for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++)
      {
        triangle_gp.coordArray = triangle_gp.coordArray.concat(inputTriangles[whichSet].vertices[whichSetVert]);
        //coordArray = coordArray.concat(inputTriangles[whichSet].vertices[whichSetVert]);
        // console.log(inputTriangles[whichSet].vertices[whichSetVert]);
      }
      // set up the triangle index array
      for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++)
      {
        //vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
        var triToAdd = inputTriangles[whichSet].triangles[whichSetTri];
        triangle_gp.indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
        triangle_gp.triBufferSize+=3;
        //indexArray = indexArray.concat(inputTriangles[whichSet].triangles[whichSetTri]);
      }
      //console.log(indexArray);

      // setup vertex color
      for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++)
      {
        var diff_col = inputTriangles[whichSet].material.diffuse;
        var ambi_col = inputTriangles[whichSet].material.ambient;
        var spec_col = inputTriangles[whichSet].material.specular;
        triangle_gp.diffuseArray.push(diff_col[0], diff_col[1], diff_col[2], 1.0);
        triangle_gp.ambientArray.push(ambi_col[0], ambi_col[1], ambi_col[2], 1.0);
        triangle_gp.specularArray.push(spec_col[0], spec_col[1], spec_col[2], 1.0);
        triangle_gp.nValueArray.push(inputTriangles[whichSet].material.n);
      }

      //setup normal vertices
      for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].normals.length; whichSetVert++)
      {
        var normal_val = inputTriangles[whichSet].normals[whichSetVert];
        triangle_gp.normalArray.push(normal_val[0], normal_val[1], normal_val[2], 1.0);
      }

      vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices


      // console.log(coordArray.length);
      // send the vertex coords to webGL
      // send the vertex coords to webGL
      triangle_gp.vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
      gl.bindBuffer(gl.ARRAY_BUFFER,triangle_gp.vertexBuffer); // activate that buffer
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(triangle_gp.coordArray),gl.STATIC_DRAW); // coords to that buffer

      //send diffuse buffer to webGL
      triangle_gp.diffuseBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle_gp.diffuseBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangle_gp.diffuseArray),gl.STATIC_DRAW);

      //send ambient buffer to webGL
      triangle_gp.ambientBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle_gp.ambientBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangle_gp.ambientArray),gl.STATIC_DRAW);

      //send specular buffer to webGL
      triangle_gp.specularBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle_gp.specularBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangle_gp.specularArray),gl.STATIC_DRAW);

      //send n Value buffer to webGL
      triangle_gp.nValueBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle_gp.nValueBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangle_gp.nValueArray),gl.STATIC_DRAW);

      //send normal buffer to webGL
      triangle_gp.normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle_gp.normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangle_gp.normalArray),gl.STATIC_DRAW);

      // send the triangle indices to webGL
      triangle_gp.triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangle_gp.triangleBuffer); // activate that buffer
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(triangle_gp.indexArray),gl.STATIC_DRAW); // indices to that buffer

      complete_set.push(triangle_gp);
    }
  } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {

    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
      precision mediump float;

      uniform vec4 finalEyeLoc;
      uniform vec4 finalLightLoc;
      uniform vec4 finalLightCol;

      varying vec4 finalDiffuseColor;
      varying vec4 finalAmbientColor;
      varying vec4 finalSpecularColor;
      varying vec4 finalNormalVal;
      varying float finalNVal;
      varying vec4 finalvertexPosition;

      void main(void) {

        vec4 l = normalize(finalLightLoc - finalvertexPosition);
        vec4 N = normalize(finalNormalVal);
        vec4 H = normalize(finalLightLoc + finalEyeLoc - finalvertexPosition);

        float NdotL = max(0.0, dot(N, l));
        float NdotH = max(0.0, dot(N, H));

        vec4 ambientpart = finalLightCol * finalAmbientColor;
        vec4 diffusepart = finalDiffuseColor * finalLightCol * NdotL;
        vec4 specularpart = finalSpecularColor * finalLightCol * pow(NdotH, finalNVal);
        vec4 finalColor = ambientpart + diffusepart + specularpart;

        gl_FragColor = finalColor;
      }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
      attribute vec3 vertexPosition;

      attribute vec4 diffuseAttribute;
      attribute vec4 ambientAttribute;
      attribute vec4 specularAttribute;
      attribute float nValAttribute;
      attribute vec4 normalValAttribute;

      uniform mat4 uniformViewMatrix;
      uniform mat4 uniformPerspMatrix;
      uniform mat4 uniformModelMatrix;

      varying vec4 finalDiffuseColor;
      varying vec4 finalAmbientColor;
      varying vec4 finalSpecularColor;
      varying vec4 finalNormalVal;
      varying float finalNVal;
      varying vec4 finalvertexPosition;

      void main(void) {
        finalvertexPosition = uniformPerspMatrix * uniformViewMatrix * uniformModelMatrix * vec4(vertexPosition, 1.0);
        gl_Position = uniformPerspMatrix * uniformViewMatrix * uniformModelMatrix * vec4(vertexPosition, 1.0); // use the untransformed position
        finalDiffuseColor = diffuseAttribute;
        finalAmbientColor = ambientAttribute;
        finalSpecularColor = specularAttribute;
        finalNVal = nValAttribute;
        finalNormalVal = normalValAttribute;
      }
    `;

    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
              gl.useProgram(shaderProgram); // activate shader program (frag and vert)
              vertexPositionAttrib = // get pointer to vertex shader input
                  gl.getAttribLocation(shaderProgram, "vertexPosition");
              gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array

              uniformViewMat = gl.getUniformLocation(shaderProgram, "uniformViewMatrix");
              uniformPersMat = gl.getUniformLocation(shaderProgram, "uniformPerspMatrix");
              uniformModelMat = gl.getUniformLocation(shaderProgram, "uniformModelMatrix");

              uniformEyeLoc = gl.getUniformLocation(shaderProgram, "finalEyeLoc");
              uniformLightLoc = gl.getUniformLocation(shaderProgram, "finalLightLoc");
              uniformLightCol = gl.getUniformLocation(shaderProgram, "finalLightCol");

              diffusePositionAttrib = gl.getAttribLocation(shaderProgram, "diffuseAttribute");
              gl.enableVertexAttribArray(diffusePositionAttrib);

              ambientPositionAttrib = gl.getAttribLocation(shaderProgram, "ambientAttribute");
              gl.enableVertexAttribArray(ambientPositionAttrib);

              specularPositionAttrib = gl.getAttribLocation(shaderProgram, "specularAttribute");
              gl.enableVertexAttribArray(specularPositionAttrib);

              nPositionAttrib = gl.getAttribLocation(shaderProgram, "nValAttribute");
              gl.enableVertexAttribArray(nPositionAttrib);

              normalPositionAttrib = gl.getAttribLocation(shaderProgram, "normalValAttribute");
              gl.enableVertexAttribArray(normalPositionAttrib);
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try

    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders
//var bgColor = 0;
// render the loaded model
function renderTriangles() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

  gl.uniformMatrix4fv(uniformViewMat, false, viewMatrix);
  gl.uniformMatrix4fv(uniformPersMat, false, perspMatrix);

  gl.uniform4fv(uniformEyeLoc, EyeLoc);
  gl.uniform4fv(uniformLightLoc, LightLoc);
  gl.uniform4fv(uniformLightCol, LightCol);

  //console.log(complete_set);
  for (let i=0; i<complete_set.length; i++)
  {

    gl.uniformMatrix4fv(uniformModelMat, false, modelMatrix);

    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,complete_set[i].vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    // diffuse color
    gl.bindBuffer(gl.ARRAY_BUFFER,complete_set[i].diffuseBuffer);
    gl.vertexAttribPointer(diffusePositionAttrib,4,gl.FLOAT,false,0,0);

    // ambient
    gl.bindBuffer(gl.ARRAY_BUFFER,complete_set[i].ambientBuffer);
    gl.vertexAttribPointer(ambientPositionAttrib,4,gl.FLOAT,false,0,0);

    //specular
    gl.bindBuffer(gl.ARRAY_BUFFER, complete_set[i].specularBuffer);
    gl.vertexAttribPointer(specularPositionAttrib, 4, gl.FLOAT, false, 0, 0);

    //n value
    gl.bindBuffer(gl.ARRAY_BUFFER, complete_set[i].nValueBuffer);
    gl.vertexAttribPointer(nPositionAttrib, 1, gl.FLOAT, false, 0, 0);

    //normal value
    gl.bindBuffer(gl.ARRAY_BUFFER, complete_set[i].normalBuffer);
    gl.vertexAttribPointer(normalPositionAttrib, 4, gl.FLOAT, false, 0, 0);
    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,complete_set[i].triangleBuffer); // activate
    gl.drawElements(gl.TRIANGLES,complete_set[i].triBufferSize,gl.UNSIGNED_SHORT,0); // render
  }
} // end render triangles

function handleKeyDown()
{
  pressedKey[event.keyCode] = true;
  switch(event.key)
  {
    case "a":
      console.log("translate view left along X axis");
      mat4.translate(modelMatrix, modelMatrix, [0.1, 0, 0]);
      renderTriangles();
      return;
    case "d":
      console.log("translate view right along X axis");
      mat4.translate(modelMatrix, modelMatrix, [-0.1, 0, 0]);
      renderTriangles();
      return;
    case "w":
      console.log("translate view forward along Z axis");
      mat4.translate(modelMatrix, modelMatrix, [0, 0, -0.1]);
      renderTriangles();
      return;
    case "s":
      console.log("translate view backward along Z axis");
      mat4.translate(modelMatrix, modelMatrix, [0, 0, 0.1]);
      renderTriangles();
      return;
    case "q":
      console.log("translate view up along Y axis");
      mat4.translate(modelMatrix, modelMatrix, [0, 0.1, 0]);
      renderTriangles();
      return;
    case "e":
      console.log("translate view down along Y axis");
      mat4.translate(modelMatrix, modelMatrix, [0, -0.1, 0]);
      renderTriangles();
      return;
    case "A":
      console.log("rotate view left around Y axis");
      mat4.rotate(modelMatrix, modelMatrix, 0.05, [0, 1, 0]);
      renderTriangles();
      return;
    case "D":
      console.log("rotate view right around Y axis");
      mat4.rotate(modelMatrix, modelMatrix, -0.05, [0, 1, 0]);
      renderTriangles();
      return;
    case "W":
      console.log("rotate view forward around X axis");
      mat4.rotate(modelMatrix, modelMatrix, 0.05, [1, 0, 0]);
      renderTriangles();
      return;
    case "S":
      console.log("rotate view backward around X axis");
      mat4.rotate(modelMatrix, modelMatrix, -0.05, [1, 0, 0]);
      renderTriangles();
      return;

  }
}

function handleKeuUp()
{
  pressedKey[event.keyCode] = false;
  console.log("-----release a key-----");
}

function handleEvents()
{
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeuUp;
}

function initMatrices()
{
  var eye3 = new vec3.fromValues(EyeLoc[0], EyeLoc[1], EyeLoc[2]);
  var center = new vec3.fromValues(EyeLoc[0] + LookAt[0], EyeLoc[1] + LookAt[1], EyeLoc[2] + LookAt[2]);
  mat4.lookAt(viewMatrix, eye3, center, ViewUp);
  mat4.perspective(perspMatrix, Math.PI/2, 1, 0.1, 100.0);
  mat4.identity(translateMatrix);
  mat4.identity(rotateMatrix);
}

/* MAIN -- HERE is where execution begins after window load */

function main() {

  setupWebGL(); // set up the webGL environment
  initMatrices();
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
  handleEvents();

} // end main
