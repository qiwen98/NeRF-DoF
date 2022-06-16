import './style.css';
import * as THREE from 'three';

import Stats from 'three/examples//jsm/libs/stats.module.js';
import { GUI } from 'three/examples//jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples//jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples//jsm/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples//jsm/renderers/CSS2DRenderer.js';
import { CustomSkeletonHelper } from './js/customSkeletonHelper.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// custom glsl filter
import { DilationShader } from './js/shaders/DilationShader.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';





///////////////////// custom obj //////////////////////////
const OBJExample = function (elementToBindTo, pos_x, pos_y, pos_z, showVis, reconstructed, transparentBone, transparentVertices,partialhuman) {

  /*
    Counts the number of times a line occurs. Case-sensitive.

    Arguments:
        elementToBindTo (str): the local file directory location to get the data, equal to dummy when open with folder.
        pos_x (float): the global world x location of the mesh.
        pos_y (float): the global world y location of the mesh.
        pos_z (float): the global world z location of the mesh.
        showVis (bool): whether this skeleton should be shown, by default all hand should not be shown and appear first.
        reconstructed (bool): mainly used to control the colors and deferentiate between machine generated skeleton and ground truth
                              , by default, ground truth in blue color, machine generated in red color, .
        transparentBone (bool): whether this skeleton bones should be shown, by default, all should not be trasparent and appear at first.
        transparentVertices (bool): whether this skeleton vertices/joints should be shown, by default, all should not be trasparent and appear at first.


    Returns:
        customSkeletonObj: a skeleton visualization with different settings.
  */


  this.path = elementToBindTo;
  this.animData = null;
  this.location_x = pos_x;
  this.location_y = pos_y;
  this.location_z = pos_z;
  this.head = null;
  this.tail = null;
  this.bones = [];
  this.showVis = showVis;

  this.partialhuman=partialhuman;


  ////fake skin mesh geometry var
  this.fakeMeshGeometry = new THREE.CylinderGeometry(5, 5, 5, 5, 15, 5, 30);
  // create skin mesh geometry var
  this.mesh = null;
  this.meshScale = 1; // by default  1, if human 0.07, else hand 1
  this.skeleton = null;
  this.boneVisHelper = null;
  this.verticesVisHelper = null;

  this.isReConstructed = reconstructed;
  //default color
  this.color1 = new THREE.Color(0, 0, 1);
  this.color2 = new THREE.Color(0, 1, 0);
  if (this.isReConstructed) {
    this.color1 = new THREE.Color(1, 0, 0);
    this.color2 = new THREE.Color(1, .5, 0);

  }
  // default bone is not transparent
  this.transparentBone = false;
  if (transparentBone) {
    this.transparentBone = true;
  }
  // default vertices is not transparent
  this.transparentVertices = false;
  if (transparentVertices) {
    this.transparentVertices = true;
  }
  this.Label = null;

  //create anim var
  this.tracks = [];
  this.clip = null;
  this.mixer = null;
  this.clipAction = null;


};

OBJExample.prototype = {

  constructor: OBJExample,

  initContent: function () {

    this._reportProgress({ detail: { text: 'Loading: ' + this.path } });

    //load file
    const loader = new THREE.FileLoader();
    const scope = this;

    const onLoadBVH = function (data) {
      console.log('Loading complete: ' + scope.path);
      scope._reportProgress({ detail: { text: '' } });
      scope.animData = JSON.parse(data);

      const dimensions = [scope.animData.length, scope.animData[0].length, scope.animData[0][0].length];
      console.log(dimensions);

      //connection array;
      if (dimensions[1] === 21) {   //(3, 21, 24)
        // scope.head = [0, 1, 2, 3, 0, 5, 6, 7, 0, 9, 10, 11, 0, 13, 14, 15, 0, 17, 18, 19]
        // scope.tail = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

        scope.head = [0, 1, 2, 3, 0, 5, 6, 7, 0, 9, 10, 11, 0, 13, 14, 15, 0, 17, 18, 19] 
        scope.tail = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      }

      else if (dimensions[1] === 38 && scope.partialhuman) {
        
        scope.head = [0, 1, 2, 3, 4, 5, 0, 7, 8, 9, 10, 11, 0, 13, 14, 15, 16, 17, 18, 15];
        scope.tail = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

        // scope.head = [0, 1, 2, 3, 4, 5, 0, 7, 8, 9, 10, 11, 0, 13, 14, 15, 16, 17, 18, 15, 20, 21, 22, 23, 24, 25, 23, 27, 15, 29, 30, 31, 32, 33, 34, 32, 36];
        // scope.tail = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37];
        scope.meshScale = 1;
      }
      else {


        scope.head = [0, 1, 2, 3, 4, 5, 0, 7, 8, 9, 10, 11, 0, 13, 14, 15, 16, 17, 18, 15, 20, 21, 22, 23, 24, 25, 23, 27, 15, 29, 30, 31, 32, 33, 34, 32, 36];
        scope.tail = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37];
        scope.meshScale = 1;
      }



      scope.createSkeleton();
      scope.createFakeSkinMesh();
      scope.createSkinMesh();
      scope.setUpAnimation();

    };

    loader.load(scope.path, onLoadBVH);


  },

  loadDataFromFile: function (data) {
    this.animData = JSON.parse(data);

    const dimensions = [this.animData.length, this.animData[0].length, this.animData[0][0].length];
    console.log(dimensions);

    //connection array;
    if (dimensions[1] === 21) {   //(3, 21, 24)
      this.head = [0, 1, 2, 3, 0, 5, 6, 7, 0, 9, 10, 11, 0, 13, 14, 15, 0, 17, 18, 19]
      this.tail = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    }

    else {
      this.head = [0, 1, 2, 3, 4, 5, 0, 7, 8, 9, 10, 11, 0, 13, 14, 15, 16, 17, 18, 15, 20, 21, 22, 23, 24, 25, 23, 27, 15, 29, 30, 31, 32, 33, 34, 32, 36];
      this.tail = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37];
      this.meshScale = 0.07;
    }



    this.createSkeleton();
    this.createFakeSkinMesh();
    this.createSkinMesh();
    this.setUpAnimation();

  },

  _reportProgress: function (event) {

    let output = '';
    if (event.detail !== null && event.detail !== undefined && event.detail.text) {

      output = event.detail.text;

    }

    console.log('Progress: ' + output);


  },

  createSkeleton: function () {
    //build root node
    let rootNode = new THREE.Bone();
    rootNode.name = 'bone_0';
    this.bones.push(rootNode);
    let vertices = [];

    // set root node position
    let pos_x = this.animData[0][0][0];
    let pos_y = this.animData[1][0][0];
    let pos_z = this.animData[2][0][0];
    rootNode.position.set(pos_x, pos_y, pos_z);
    vertices.push(rootNode.position);

    //sanity check
    // console.log(rootNode.position);
    // console.log(this.animData[2][2][23]);
    // console.log(this.animData[0][1][0]);

    // for loop // for the rest nodes
    for (let i = 1; i !== this.head.length + 1; ++i) {
      let new_node = new THREE.Bone();

      //	parent.add(new_node)
      this.bones[this.head[i - 1]].add(new_node)
      //console.log(bones[head[i]])
      //add name
      new_node.name = 'bone_' + this.tail[i - 1];
      //console.log(new_node.name)
      //bones.push(new_bone)
      this.bones.push(new_node)
      // console.log(i)

      //add in location data
      //current relative pos equal to own pos - parent pos 
      let PI = this.head[i - 1];

      pos_x = this.animData[0][i][0] - this.animData[0][PI][0];
      pos_y = this.animData[1][i][0] - this.animData[1][PI][0];
      pos_z = this.animData[2][i][0] - this.animData[2][PI][0];


      //console.log(pos_x,pos_y,pos_z);
      new_node.position.set(pos_x, pos_y, pos_z);
      vertices.push(new_node.position);

    }

    // let skeleton = new THREE.SkeletonHelper(this.bones[0] );
    // skeleton.visible = true;
    // scene.add( skeleton );


    // let  boneContainer = new THREE.Group();
    // boneContainer.add(this.bones[0]);
    // // boneContainer.scale.set(.1,.1,.1);
    // boneContainer.position.set(this.location_x,0,this.location_z);



    // scene.add(boneContainer);


  },

  createFakeSkinMesh: function () {


    // create the skin indices and skin weights

    const position = this.fakeMeshGeometry.attributes.position;

    const vertex = new THREE.Vector3();

    const skinIndices = [];
    const skinWeights = [];

    for (let i = 0; i < position.count; i++) {

      vertex.fromBufferAttribute(position, i);

      // compute skinIndex and skinWeight based on some configuration data

      const y = 1;

      const skinIndex = 1;
      const skinWeight = 1;

      skinIndices.push(skinIndex, skinIndex + 1, 0, 0);
      skinWeights.push(1 - skinWeight, skinWeight, 0, 0);

    }

    this.fakeMeshGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    this.fakeMeshGeometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  },

  createSkinMesh: function () {


    const material = new THREE.MeshBasicMaterial({ color: 0xff6347, wireframe: true });
    this.mesh = new THREE.SkinnedMesh(this.fakeMeshGeometry, material);

    // console.log(this.mesh);
    this.skeleton = new THREE.Skeleton(this.bones);


    // see example from THREE.Skeleton

    const rootBone = this.skeleton.bones[0];
    this.mesh.add(rootBone);
    this.mesh.visible = false;
    // bind the skeleton to the mesh

    this.mesh.bind(this.skeleton);
    this.mesh.position.set(this.location_x, this.location_y, this.location_z);
    this.mesh.scale.set(this.meshScale, this.meshScale, this.meshScale);

    scene.add(this.mesh);
    //scene.add( this.skeleton );

    this.boneVisHelper = new CustomSkeletonHelper(this.mesh, this.color1, this.color2, this.transparentBone, renderer);



    this.boneVisHelper.visible = this.showVis;
    scene.add(this.boneVisHelper);
    console.log(this.boneVisHelper);

    /////////////////////////// set the vertices///////////////////////


    const pointsMaterial = new THREE.PointsMaterial({
      color: this.color2,
      size: 10,
      sizeAttenuation: false,
      map: new THREE.TextureLoader().load('disc.png'),
      alphaTest: 0.5
    });

    this.verticesVisHelper = new THREE.Points(this.boneVisHelper.geometry, pointsMaterial);
    this.boneVisHelper.add(this.verticesVisHelper);
    if (this.transparentVertices) { this.verticesVisHelper.material.opacity = 0 }

    // let geometry2 = new LineSegmentsGeometry().setPositions( this.boneVisHelper.geometry.attributes.position.array );
    // let material2 =  new LineMaterial({ color: 0x000000,linewidth: 0.001, })
    // let lines = new THREE.LineSegments(geometry2, material2);
    // this.boneVisHelper.add(lines);

    ////////////////////////////////////////////////////////////////////

    const Div = document.createElement('div');
    Div.className = 'label';
    Div.textContent = 'Text';
    Div.style.color = this.color2.getStyle();
    Div.style.marginTop = '-1em';
    this.Label = new CSS2DObject(Div);
    this.Label.position.copy(this.mesh.position);
    this.Label.visible = false; // by default dont show label

    this.boneVisHelper.add(this.Label);




  },

  setUpAnimation: function () {

    //if hand 24 fps else human 120 fps
    const totalFrame = this.animData[0][0].length, frameRate = totalFrame === 24 ? 24 : 120, duration = totalFrame / frameRate;

    //console.log(frameRate);
    const times = [], values = [], tmp = new THREE.Vector3();
    // ********* node 0 dont have parent !!!! *****
    // for each frame 
    for (let frame_i = 0; frame_i < totalFrame; frame_i++) {
      times.push(frame_i / frameRate); // i / frame_rate

      //add in location data



      let pos_x = this.animData[0][0][frame_i]
      let pos_y = this.animData[1][0][frame_i]
      let pos_z = this.animData[2][0][frame_i]


      tmp.set(pos_x, pos_y, pos_z).
        toArray(values, values.length);

    }

    const trackName = '.bones[bone_0].position';
    const track = new THREE.VectorKeyframeTrack(trackName, times, values);
    this.tracks.push(track);

    // ********* node 0 end!!!! *****

    //for each bone node other than   
    for (let i = 1; i < this.head.length; i++) {

      const times = [], values = [], tmp = new THREE.Vector3();

      // for each frame 
      for (let frame_i = 0; frame_i < totalFrame; frame_i++) {
        times.push(frame_i / frameRate); // i / frame_rate

        //add in location data
        //current relative pos equal to own pos - parent pos 
        let PI = this.head[i - 1];
        let I = this.tail[i - 1];

        //console.log (PI+"->"+I);

        let pos_x = this.animData[0][I][frame_i] - this.animData[0][PI][frame_i];
        let pos_y = this.animData[1][I][frame_i] - this.animData[1][PI][frame_i];
        let pos_z = this.animData[2][I][frame_i] - this.animData[2][PI][frame_i];


        tmp.set(pos_x, pos_y, pos_z).
          toArray(values, values.length);

      }

      const trackName = '.bones[bone_' + i + '].position';

      const track = new THREE.VectorKeyframeTrack(trackName, times, values);

      this.tracks.push(track)
    }

    this.clip = new THREE.AnimationClip('Action', duration, this.tracks);
    // aeguemenrt 2 above is total length of clip, eg, 0.088*2730

    // setup the THREE.AnimationMixer
    this.mixer = new THREE.AnimationMixer(this.mesh);


    // create a ClipAction and set it to play
    this.clipAction = this.mixer.clipAction(this.clip);
    this.clipAction.play();
    actions.push(this.clipAction);
    //console.log(this.clip);

    mixers.push(this.mixer);

  },
}
///////////////////// custom obj end //////////////////////////

let scene, renderer, camera, stats, labelRenderer, composer, Gridhelper,perspective='Perspective' ;
let model, skeleton, mixer, clock, crossFadeControls = [], demoControls = [],perspectiveGUI=[];
const mixers = [], actions = [], models = [];
let controls;
let currentSkeletonType = 'human';
const maxDemoItemAllowed = 4;
let DilationEffect;

let currentBaseAction = 'idle';
const allActions = [];
const baseActions = {
  idle: { weight: 1 },
  walk: { weight: 0 },
  run: { weight: 0 }
};
const additiveActions = {
  sneak_pose: { weight: 0 },
  sad_pose: { weight: 0 },
  agree: { weight: 0 },
  headShake: { weight: 0 }
};
let panelSettings, numAnimations;


/// init the scene
init();
//var for GUI panels
let singleStepMode = false;
let sizeOfNextStep = 0;
/// init GLTF and GUI panels
loadGLTF();
/// load all demo data/s
/// arguments (elementToBindTo, pos_x, pos_y, pos_z, showVis, reconstructed, transparentBone, transparentVertices,partialhuman)
// const hand_1 = new OBJExample( "models/files/oursgated/OursGated_cover_uncorrupted.json",-0.5,0.3,0,false,false,false);
// hand_1.initContent();
// models.push(hand_1);

// const hand_2 = new OBJExample( "models/files/oursgated/OursGated_recon_cover_uncorrupted.json",0.5,0.3,0,false,true,false,false);
// hand_2.initContent();
// models.push(hand_2);

const hand_3 = new OBJExample( "models/files/Mix/OursGated_cover_uncorrupted.json",0.5,0.3,0,true,false,false);
hand_3.initContent();
models.push(hand_3);

const hand_4 = new OBJExample( "models/files/Mix/OursGated_recon_cover_corrupted.json",0.5,0.3,0,true,true,false,false);
hand_4.initContent();
models.push(hand_4);

// const hand_3 = new OBJExample("models/files/hand_output.json", 0, 0.3, 0, false, true,false,true);
// hand_3.initContent();
// models.push(hand_3);


const human_1 = new OBJExample( "models/files/Baluja_secret_uncorrupted.json",-0.5,1.15,0,true,false,false,false,true);
human_1.initContent();
models.push(human_1); 

const human_2 = new OBJExample( "models/files/Baluja_recon_secret_corrupted.json",-0.5,1.15,0,true,true,false,false);
human_2.initContent();
models.push(human_2);

// const human_3 = new OBJExample("models/files/output.json", 0.0, 1.15, 0, true, false, false, true);
// human_3.initContent();
// models.push(human_3);

///loading end////////////////////////////

function init() {

  const container = document.getElementById('container');
  document.getElementById('file1').addEventListener('change', handleFileOneSelect, false);
  document.getElementById('file2').addEventListener('change', handleFileTwoSelect, false);
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  //scene.background = new THREE.Color( 0xa0a0a0 );
  //scene.fog = new THREE.Fog( 0xa0a0a0, 10, 50 );
  //scene.background = new THREE.Color(   0xffffff );
   scene.background = new THREE.Color(0x444444);

  //scene.fog = new THREE.Fog( 0x999999, 10, 50 );

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
  hemiLight.position.set(0, 20, 0);
  //scene.add( hemiLight );

  const dirLight = new THREE.DirectionalLight(0xffffff);
  dirLight.position.set(3, 10, 10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 2;
  dirLight.shadow.camera.bottom = - 2;
  dirLight.shadow.camera.left = - 2;
  dirLight.shadow.camera.right = 2;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 40;
  //scene.add( dirLight );

  // ground

  //const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
  //const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 100, 100 ), new THREE.MeshPhongMaterial( { color: 0xa0a0a0, depthWrite: false } ) );
  //const mesh = new THREE.Mesh( new THREE.BoxGeometry( 100, 1, 100 ), new THREE.MeshPhongMaterial( {} ) );
  //mesh.rotation.x = - Math.PI / 2;
  //mesh.receiveShadow = true;
  //scene.add( mesh );

  Gridhelper = new THREE.GridHelper(20, 20, 0x888888);

  //Gridhelper.rotation.x = Math.PI / 2;
  scene.add(Gridhelper);


  const width = window.innerWidth;
	const height = window.innerHeight;

  // camera
  camera = new THREE.PerspectiveCamera(45, width / height, 1, 100);
  camera.position.set(0, 1, 3);



  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  //post processing
  postProcessing();



  //obit control
  obitControl();

  // css renderer
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);








  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener('resize', onWindowResize);

}

function loadGLTF() {
  const loader = new GLTFLoader();
  loader.load('models/gltf/Xbot.glb', function (gltf) {

    model = gltf.scene;
    scene.add(model);

    model.traverse(function (object) {

      if (object.isMesh) object.castShadow = true;
      if (object.isMesh) object.visible = false;

    });




    skeleton = new THREE.SkeletonHelper(model);
    skeleton.visible = false;
    scene.add(skeleton);

   
    const animations = gltf.animations;
    mixer = new THREE.AnimationMixer(model);

    numAnimations = animations.length;

    for (let i = 0; i !== numAnimations; ++i) {

      let clip = animations[i];
      const name = clip.name;

      if (baseActions[name]) {

        const action = mixer.clipAction(clip);
        activateAction(action);
        baseActions[name].action = action;
        allActions.push(action);

      } else if (additiveActions[name]) {

        // Make the clip additive and remove the reference frame

        THREE.AnimationUtils.makeClipAdditive(clip);

        if (clip.name.endsWith('_pose')) {

          clip = THREE.AnimationUtils.subclip(clip, clip.name, 2, 3, 30);

        }

        const action = mixer.clipAction(clip);
        activateAction(action);
        additiveActions[name].action = action;
        allActions.push(action);

      }

    }

    createPanel();


    animate();

  });
};

function postProcessing()
{
  // postprocessing

  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // const afterimagePass = new AfterimagePass();
  // afterimagePass.uniforms['damp'].value=0.95;
  // composer.addPass( afterimagePass );
  // post processing Dilation

  DilationEffect = new ShaderPass(DilationShader);
  DilationEffect.uniforms['sourceTextureSize'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
  DilationEffect.uniforms['sourceTexelSize'].value = new THREE.Vector2(1.5 / window.innerWidth, 1.5 / window.innerHeight);
  composer.addPass(DilationEffect);

  const pass = new SMAAPass( window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio() );
  composer.addPass( pass );
}

function obitControl()
{
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = true;
  // controls.enableZoom = false;
  controls.autoRotate = true;
  controls.target.set(0, 1, 0);

  controls.update();
}

function createPanel() {


  const panel = new GUI({ width: 310 });

  const folder1 = panel.addFolder('Visibility');
  const folder6 = panel.addFolder('Camera Controls');
  const folder2 = panel.addFolder('Activation/Deactivation');
  const folder3 = panel.addFolder('Pause Stepping');
  const folder4 = panel.addFolder('General Speed');
  const folder5 = panel.addFolder('Scale and Pos');
  

  panelSettings = {
    'show hand demo': function () {

      skeletonTypeToShow('hand');
      currentSkeletonType = 'hand';

    },
    'show human demo': function () {

      skeletonTypeToShow('human');
      currentSkeletonType = 'human';

    },
    'clear all scene object': function () {

      skeletonTypeToShow('None');
      currentSkeletonType = 'None';

    },
    'camera rotate': true,
    'set photo mode':false,
    'modify time scale': 1.0,
    'deactivate all': deactivateAllActions,
    'activate all': activateAllActions,
    'pause/continue': pauseContinue,
    'make single step': toSingleStepMode,
    'modify step size': 0.05,
    'set Grid scale': 1,
    'set Grid XY':1,
    'set Obj Rotate Angle':1,
    'bone opacity (transparent)': 1,
    'vertices opacity (transparent)': 1,
    'show/disable label': false,
    'show/disable dilation(post-process)': true,
    'perspective camera':switchCamera,
    'orthographic camera':switchCamera,

    
  };



  // const baseNames = ['None', ...Object.keys(baseActions)];

  // for (let i = 0, l = baseNames.length; i !== l; ++i) {

  //   const name = baseNames[i];
  //   const settings = baseActions[name];
  //   panelSettings[name] = function () {

  //     const currentSettings = baseActions[currentBaseAction];
  //     const currentAction = currentSettings ? currentSettings.action : null;
  //     const action = settings ? settings.action : null;

  //     prepareCrossFade(currentAction, action, 0.35);

  //   };

  //   crossFadeControls.push(folder1.add(panelSettings, name));

  // }

  // for (const name of Object.keys(additiveActions)) {

  //   const settings = additiveActions[name];

  //   panelSettings[name] = settings.weight;
  //   folder2.add(panelSettings, name, 0.0, 1.0, 0.01).listen().onChange(function (weight) {

  //     setWeight(settings.action, weight);
  //     settings.weight = weight;

  //   });

  // }

  demoControls.push(folder1.add(panelSettings, 'show hand demo'));
  demoControls.push(folder1.add(panelSettings, 'show human demo'));
  demoControls.push(folder1.add(panelSettings, 'clear all scene object'));

  folder6.add(panelSettings, 'camera rotate').onChange(cameraRotate);
  folder6.add(panelSettings, 'set photo mode').onChange(setPhotoMode);
  perspectiveGUI.push(folder6.add(panelSettings, 'perspective camera'));
  perspectiveGUI.push(folder6.add( panelSettings, 'orthographic camera'));
  folder1.add(panelSettings, 'bone opacity (transparent)', 0, 1, 1).onChange(setBoneTransparent);
  folder1.add(panelSettings, 'vertices opacity (transparent)', 0, 1, 1).onChange(setVerticesTransparent);
  folder1.add(panelSettings, 'show/disable label').onChange(showLabel);
  folder1.add(panelSettings, 'show/disable dilation(post-process)');

  folder2.add(panelSettings, 'deactivate all');
  folder2.add(panelSettings, 'activate all');
  folder3.add(panelSettings, 'pause/continue');
  folder3.add(panelSettings, 'make single step');
  folder3.add(panelSettings, 'modify step size', 0.01, 0.1, 0.001);

  folder4.add(panelSettings, 'modify time scale', 0.0, 1.5, 0.01).onChange(modifyTimeScale);
  folder5.add(panelSettings, 'set Grid scale', 0.01, 3, 0.01).onChange(setGridScale);
  folder5.add(panelSettings, 'set Grid XY', 0.01, 2, 0.01).onChange(setGridXY);
  folder5.add(panelSettings, 'set Obj Rotate Angle',0.01, 4, 0.01).onChange(setObjRotate);



  folder1.open();
  folder2.open();
  folder3.open();
  folder4.open();
  folder5.open();

  crossFadeControls.forEach(function (control) {

    control.setInactive = function () {

      control.domElement.classList.add('control-inactive');

    };

    control.setActive = function () {

      control.domElement.classList.remove('control-inactive');

    };

    const settings = baseActions[control.property];

    if (!settings || !settings.weight) {

      control.setInactive();

    }

  });

}

function showLabel(yesno) {

  models.forEach(function (model) {

    if (model.boneVisHelper.visible === true) {
      model.Label.visible = yesno;
    }


  });

}

function setVerticesTransparent(opacity) {
  models.forEach(function (model) {


    model.verticesVisHelper.material.opacity = opacity;
  });

}

function setBoneTransparent(opacity) {
  models.forEach(function (model) {

    model.boneVisHelper.material.opacity = opacity;

  });


}

function cameraRotate(yesno) {
  controls.autoRotate = yesno;
  camera.position.set(0, 1, 3);
  
}

function setPhotoMode(yesno)
{

  if(yesno)
  {
    switchCamera();
    Gridhelper.rotation.x = Math.PI / 2;

    // camera.position.set(0, 1, 3);
  }
  else
  {
    Gridhelper.rotation.x = Math.PI ;
    //camera.position.set(0, 1, 3);
   // Gridhelper.rotation.x = Math.PI / 2;
  }

  
  

}

function switchCamera() {
  if (camera instanceof THREE.PerspectiveCamera) {
    camera = new THREE.OrthographicCamera(
    window.innerWidth / - 1000, window.innerWidth / 1000,window.innerHeight / 1000, window.innerHeight / - 1000, 1, 10 );
    camera.position.x = 0;
    camera.position.y = 1;
    camera.position.z = 3;
    // camera.lookAt(scene.position);
    perspective = "Orthographic";
  } else {
    camera = new THREE.PerspectiveCamera(45,
    window.innerWidth / window.innerHeight, 0.1, 1000); 
    camera.position.x = 0;
    camera.position.y = 1;
    camera.position.z = 3;
    // camera.lookAt(scene.position);
    perspective = "Perspective";
  }
  postProcessing();
  obitControl();
  cameraRotate(false);
  //
  
};

function skeletonTypeToShow(skeletonType) {


  //model.visible = visibility;
  if (skeletonType === 'hand') {
    models.forEach(function (model) {



      if (model.tail.length === 20) {
        model.boneVisHelper.visible = true;
        showLabel(panelSettings['show/disable label']);
      }
      else {
        model.boneVisHelper.visible = false;
        model.Label.visible=false;
        showLabel(panelSettings['show/disable label'])
      }




    });
  }
  else if (skeletonType === 'human') {
    models.forEach(function (model) {

      if (model.tail.length !== 20) {
        model.boneVisHelper.visible = true;
        showLabel(panelSettings['show/disable label'])
      }
      else {
        model.boneVisHelper.visible = false;
        model.Label.visible=false;
        showLabel(panelSettings['show/disable label'])
      }


    });

  }
  else {
    models.forEach(function (model) {
      model.boneVisHelper.visible = false;
      model.Label.visible = false;
      //dispose the uploaded items
      if (model.path === 'dummy/path') {
        disposeItem(model);

      }

    });

  }


}


function setGridScale(scale) {

  //app.mesh.scale.set(scale, scale, scale);
  //app2.mesh.scale.set(scale,scale,scale);
  Gridhelper.scale.set(scale, scale, scale);

}

function setGridXY(offset)
{
  Gridhelper.position.set(offset,offset,0);
}

function setObjRotate(angle)
{
  models.forEach(function (model) {
  model.mesh.rotation.set(0,angle,0)
  })
}



function modifyTimeScale(speed) {

  for (const mixer of mixers) mixer.timeScale = speed;


}

function deactivateAllActions() {

  actions.forEach(function (action) {

    action.stop();

  });

}

function activateAllActions() {

  actions.forEach(function (action) {

    action.play();

  });

}

function pauseContinue() {

  if (singleStepMode) {

    singleStepMode = false;
    unPauseAllActions();

  } else {

    if (actions[0].paused) {

      unPauseAllActions();

    } else {

      pauseAllActions();

    }

  }

}

function pauseAllActions() {

  actions.forEach(function (action) {

    action.paused = true;

  });

}

function unPauseAllActions() {

  actions.forEach(function (action) {

    action.paused = false;

  });

}

let counter =0;

function toSingleStepMode() {

  unPauseAllActions();

  singleStepMode = true;
  sizeOfNextStep = panelSettings['modify step size'];
  counter+=1;
  console.log(counter);

}

function activateAction(action) {

  const clip = action.getClip();
  const settings = baseActions[clip.name] || additiveActions[clip.name];
  setWeight(action, settings.weight);
  action.play();

}

function prepareCrossFade(startAction, endAction, duration) {

  // If the current action is 'idle', execute the crossfade immediately;
  // else wait until the current action has finished its current loop

  if (currentBaseAction === 'idle' || !startAction || !endAction) {

    executeCrossFade(startAction, endAction, duration);

  } else {

    synchronizeCrossFade(startAction, endAction, duration);

  }

  // Update control colors

  if (endAction) {

    const clip = endAction.getClip();
    currentBaseAction = clip.name;

  } else {

    currentBaseAction = 'None';

  }

  crossFadeControls.forEach(function (control) {

    const name = control.property;

    if (name === currentBaseAction) {

      control.setActive();

    } else {

      control.setInactive();

    }

  });

}

function synchronizeCrossFade(startAction, endAction, duration) {

  mixer.addEventListener('loop', onLoopFinished);

  function onLoopFinished(event) {

    if (event.action === startAction) {

      mixer.removeEventListener('loop', onLoopFinished);

      executeCrossFade(startAction, endAction, duration);

    }

  }

}

function executeCrossFade(startAction, endAction, duration) {

  // Not only the start action, but also the end action must get a weight of 1 before fading
  // (concerning the start action this is already guaranteed in this place)

  if (endAction) {

    setWeight(endAction, 1);
    endAction.time = 0;

    if (startAction) {

      // Crossfade with warping

      startAction.crossFadeTo(endAction, duration, true);

    } else {

      // Fade in

      endAction.fadeIn(duration);

    }

  } else {

    // Fade out

    startAction.fadeOut(duration);

  }

}

// This function is needed, since animationAction.crossFadeTo() disables its start action and sets
// the start action's timeScale to ((start animation's duration) / (end animation's duration))

function setWeight(action, weight) {

  action.enabled = true;
  action.setEffectiveTimeScale(1);
  action.setEffectiveWeight(weight);

}

function disposeItem(item) {
  // the item should be carefully selected before paseed in
  item.mesh.removeFromParent();
  item.boneVisHelper.removeFromParent();
  scene.remove(item);
  console.log(item.path + "has been remove")
  console.log(models)
}

// update GUI at real time. 

function updateDemoControls() {

  if (currentSkeletonType === 'hand') {

    demoControls[0].disable();
    demoControls[1].enable();

  }
  else if (currentSkeletonType === 'human') {
    demoControls[0].enable();
    demoControls[1].disable();
  }
  else {
    demoControls[0].enable();
    demoControls[1].enable();
  }

}

function updateCameraGUI(){
  if (perspective==='Perspective')
  {
      perspectiveGUI[0].disable();
      perspectiveGUI[1].enable();
  }
  else
  {
    perspectiveGUI[1].disable();
    perspectiveGUI[0].enable();
  }
}


function handleFileOneSelect(evt) {
  var f = evt.target.files[0];
  var reader = new FileReader();
  reader.onload = (function (theFile) {
    return function (e) {
      //console.log(reader.result);
      const obj3 = new OBJExample("dummy/folder_1", 0.5, 1.15, 0, true, false);
      obj3.loadDataFromFile(reader.result);


      if (models.length >= maxDemoItemAllowed + 2) {
        let item = models.splice(-2, 1)
        disposeItem(item[0]);
      }
      models.push(obj3);

      ////////////
    };
  })(f);
  reader.readAsText(f);
}

function handleFileTwoSelect(evt) {
  var f = evt.target.files[0];
  var reader = new FileReader();
  reader.onload = (function (theFile) {
    return function (e) {
      //console.log(reader.result);
      const obj4 = new OBJExample("dummy/folder_2", -0.5, 0.75, 0, true, false);
      obj4.loadDataFromFile(reader.result);


      if (models.length >= maxDemoItemAllowed + 2) {
        let item = models.splice(-2, 1)
        disposeItem(item[0]);

      }
      models.push(obj4);




    };
  })(f);
  reader.readAsText(f);
}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  DilationEffect.uniforms['sourceTextureSize'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
  DilationEffect.uniforms['sourceTexelSize'].value = new THREE.Vector2(1 / window.innerWidth, 1 / window.innerHeight);

  labelRenderer.setSize(window.innerWidth, window.innerHeight);

}

function render() {
  stats.update();

  labelRenderer.render(scene, camera);

  if (panelSettings['show/disable dilation(post-process)']) {

    composer.render();

  } else {

    renderer.render(scene, camera);

  }
}

function animate() {

  // Render loop

  requestAnimationFrame(animate);

  for (let i = 0; i !== numAnimations; ++i) {

    const action = allActions[i];
    const clip = action.getClip();
    const settings = baseActions[clip.name] || additiveActions[clip.name];
    settings.weight = action.getEffectiveWeight();

  }

  // update GUI everyframe
  updateCameraGUI();
  updateDemoControls();
  controls.update();


  // Get the time elapsed since the last frame, used for mixer update

  let mixerUpdateDelta = clock.getDelta();


  if (singleStepMode) {

    mixerUpdateDelta = sizeOfNextStep;
    sizeOfNextStep = 0;



  }

  // Update the animation mixer, the stats panel, and render this frame

  mixer.update(mixerUpdateDelta);
  for (const mixer of mixers) mixer.update(mixerUpdateDelta);

  render();


}
