import './style.css';
import * as THREE from 'three';

import Stats from 'three/examples//jsm/libs/stats.module.js';
import { GUI } from 'three/examples//jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples//jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples//jsm/loaders/GLTFLoader.js';
import { SVGLoader } from 'three/examples//jsm/loaders/SVGLoader.js';
import { FontLoader } from 'three/examples//jsm/loaders/FontLoader.js';
//import {OBJExample} from './js/customObj.js';

///////////////////// custom obj //////////////////////////
const OBJExample = function ( elementToBindTo,pos_x,pos_z,meshScale ) {


  this.path= elementToBindTo;
  this.animData=null;
  this.location_x=pos_x;
  this.location_z=pos_z;
  this.head = null;
  this.tail = null;
  this.bones=[];

  ////fake skin mesh geometry var
  this.fakeMeshGeometry = new THREE.CylinderGeometry(5, 5, 5, 5, 15, 5, 30);
  // create skin mesh geometry var
  this.mesh=null;
  this.meshScale=0.07;
  this.skeleton=null;
  this.boneVisHelper=null;

  //create anim var
  this.tracks=[];
  this.clip =null;
  this.mixer=null;
  this.clipAction=null;


};

OBJExample.prototype = {

  constructor: OBJExample,

  initContent: function () {

    const modelName = 'female02';
    this._reportProgress( { detail: { text: 'Loading: ' + modelName } } );

    //load file
    const loader = new THREE.FileLoader();
    const scope = this;

    const onLoadBVH = function ( data ) {
      console.log( 'Loading complete: ' + modelName );
      scope._reportProgress( { detail: { text: '' } } );
      scope.animData= JSON.parse(data); 
 
      const dimensions = [ scope.animData.length, scope.animData[0].length ,scope.animData[0][0].length];
          console.log( dimensions);

           //connection array;
          if(dimensions[1]===21)
          {   //(3, 21, 24)
            scope.head   = [ 0,  1,  2, 3, 0,  5,  6,  7,  0,9, 10, 11, 0, 13, 14, 15, 0,17, 18,19]
            scope.tail   = [  1,  2,  3, 4, 5,  6,  7,  8, 9,10, 11, 12, 13, 14, 15, 16, 17,18, 19,20]
          }

          else
          {
            scope.head=[0,1,2,3,4,5,0,7,8,9,10,11,0, 13,14,15,16,17,18,15,20,21,22,23,24,25,23,27,15,29,30,31,32,33,34,32,36];
            scope.tail=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37];
          }



          scope.createSkeleton();
          scope.createFakeSkinMesh();
          scope.createSkinMesh();
          scope.setUpAnimation();

    };

    loader.load( scope.path, onLoadBVH );


  },

  _reportProgress: function ( event ) {

    let output = '';
    if ( event.detail !== null && event.detail !== undefined && event.detail.text ) {

      output = event.detail.text;

    }

    console.log( 'Progress: ' + output );


  },

  createSkeleton: function(){
    //build root node
    let rootNode = new THREE.Bone();
    rootNode.name = 'bone_0';
    this.bones.push(rootNode);
  
    // set root node position
    let pos_x=this.animData[0][0][0];
    let pos_y=this.animData[1][0][0];
    let pos_z=this.animData[2][0][0];
    rootNode.position.set(pos_x,pos_y,pos_z);
  
    //sanity check
    console.log(rootNode.position);
    console.log(this.animData[2][2][23]);
    console.log(this.animData[0][1][0]);
  
      // for loop // for the rest nodes
      for (let i = 1; i !== this.head.length+1; ++i)
      {
          let new_node = new THREE.Bone();
  
          //	parent.add(new_node)
          this.bones[this.head[i-1]].add(new_node)
          //console.log(bones[head[i]])
          //add name
          new_node.name = 'bone_'+this.tail[i-1];
          //console.log(new_node.name)
          //bones.push(new_bone)
          this.bones.push(new_node)
          // console.log(i)
  
          //add in location data
          //current relative pos equal to own pos - parent pos 
          let PI =this.head[i-1];
  
          pos_x=this.animData[0][i][0]-this.animData[0][PI][0];
          pos_y=this.animData[1][i][0]-this.animData[1][PI][0];
          pos_z=this.animData[2][i][0]-this.animData[2][PI][0];
  
  
          //console.log(pos_x,pos_y,pos_z);
          new_node.position.set(pos_x,pos_y,pos_z);
          
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

  createFakeSkinMesh: function(){
  

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

  createSkinMesh: function(){

    
    const material = new THREE.MeshBasicMaterial({ color: 0xff6347, wireframe: true });
    this.mesh = new THREE.SkinnedMesh(this.fakeMeshGeometry, material);
   
    // console.log(this.mesh);
    this.skeleton = new THREE.Skeleton(this.bones);
  
    // see example from THREE.Skeleton
  
    const rootBone = this.skeleton.bones[0];
    this.mesh.add(rootBone);
    this.mesh.visible=false;
    // bind the skeleton to the mesh
  
    this.mesh.bind(this.skeleton);
    this.mesh.position.set(this.location_x,1.15,this.location_z);
    this.mesh.scale.set(this.meshScale,this.meshScale,this.meshScale);
    
    scene.add(this.mesh);
    //scene.add( this.skeleton );
    this.boneVisHelper = new THREE.SkeletonHelper(this.mesh);
    this.boneVisHelper.material.linewidth = 1;
    this.boneVisHelper.visible = true;
    scene.add(this.boneVisHelper);
  },

  setUpAnimation: function (){

    //if hand 24 fps else human 120 fps
    const totalFrame = this.animData[0][0].length, frameRate = totalFrame===24 ? 24 : 120, duration = totalFrame / frameRate;

    console.log(frameRate);
    const times = [], values = [], tmp = new THREE.Vector3();
    // ********* node 0 dont have parent !!!! *****
    // for each frame 
    for (let frame_i = 0; frame_i<totalFrame; frame_i++)
    {
        times.push(frame_i / frameRate); // i / frame_rate

        //add in location data



        let pos_x=this.animData[0][0][frame_i]
        let pos_y=this.animData[1][0][frame_i]
        let pos_z=this.animData[2][0][frame_i]


        tmp.set(pos_x, pos_y, pos_z).
            toArray(values, values.length);
        
    }

    const trackName = '.bones[bone_0].position';
    const track = new THREE.VectorKeyframeTrack(trackName, times, values);
    this.tracks.push(track);

    // ********* node 0 end!!!! *****

    //for each bone node other than   
    for (let i = 1; i<this.animData[0].length; i++)
    {

        const times = [], values = [], tmp = new THREE.Vector3();
        
        // for each frame 
        for (let frame_i = 0; frame_i<totalFrame; frame_i++)
        {
            times.push(frame_i / frameRate); // i / frame_rate

            //add in location data
            //current relative pos equal to own pos - parent pos 
            let PI =this.head[i-1];
            let I = this.tail[i-1];

            //console.log (PI+"->"+I);

            let pos_x=this.animData[0][I][frame_i]-this.animData[0][PI][frame_i];
            let pos_y=this.animData[1][I][frame_i]-this.animData[1][PI][frame_i];
            let pos_z=this.animData[2][I][frame_i]-this.animData[2][PI][frame_i];


            tmp.set(pos_x, pos_y, pos_z).
                toArray(values, values.length);
            
        }

        const trackName = '.bones[bone_'+i+'].position';

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
    //console.log(this.clip);

    mixers.push(this.mixer);

  },
}
///////////////////// custom obj end //////////////////////////

let scene, renderer, camera, stats;
let model, skeleton, mixer, clock;

const crossFadeControls = [];
const mixers = [];

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
/// init GLTF
loadGLTF();
/// load all demo data/s
const app = new OBJExample( "models/files/hand_output.json",1,1,0,scene);
app.initContent();


const app2 = new OBJExample( "models/files/output.json",-1,- 1,0,scene);
app2.initContent();

function init() {

  const container = document.getElementById( 'container' );
  document.getElementById('file1').addEventListener('change', handleFileOneSelect, false);
  document.getElementById('file2').addEventListener('change', handleFileTwoSelect, false);
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xa0a0a0 );
  scene.fog = new THREE.Fog( 0xa0a0a0, 10, 50 );

  const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
  hemiLight.position.set( 0, 20, 0 );
  scene.add( hemiLight );

  const dirLight = new THREE.DirectionalLight( 0xffffff );
  dirLight.position.set( 3, 10, 10 );
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 2;
  dirLight.shadow.camera.bottom = - 2;
  dirLight.shadow.camera.left = - 2;
  dirLight.shadow.camera.right = 2;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 40;
  scene.add( dirLight );

  // ground

  const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 100, 100 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
  mesh.rotation.x = - Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add( mesh );



  //console.log(app2.pos_z);

  //app.initContent();



  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  container.appendChild( renderer.domElement );

  // camera
  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 100 );
  camera.position.set( - 1, 2, 3 );

  const controls = new OrbitControls( camera, renderer.domElement );
  controls.enablePan = true;
  controls.enableZoom = false;
  controls.target.set( 0, 1, 0 );
  controls.update();

  stats = new Stats();
  container.appendChild( stats.dom );

  window.addEventListener( 'resize', onWindowResize );

}

function loadGLTF()
{
  const loader = new GLTFLoader();
  loader.load( 'models/gltf/Xbot.glb', function ( gltf ) {

    model = gltf.scene;
    scene.add( model );

    model.traverse( function ( object ) {

      if ( object.isMesh ) object.castShadow = true;

    } );

    skeleton = new THREE.SkeletonHelper( model );
    skeleton.visible = false;
    scene.add( skeleton );

    const animations = gltf.animations;
    mixer = new THREE.AnimationMixer( model );

    numAnimations = animations.length;

    for ( let i = 0; i !== numAnimations; ++ i ) {

      let clip = animations[ i ];
      const name = clip.name;

      if ( baseActions[ name ] ) {

        const action = mixer.clipAction( clip );
        activateAction( action );
        baseActions[ name ].action = action;
        allActions.push( action );

      } else if ( additiveActions[ name ] ) {

        // Make the clip additive and remove the reference frame

        THREE.AnimationUtils.makeClipAdditive( clip );

        if ( clip.name.endsWith( '_pose' ) ) {

          clip = THREE.AnimationUtils.subclip( clip, clip.name, 2, 3, 30 );

        }

        const action = mixer.clipAction( clip );
        activateAction( action );
        additiveActions[ name ].action = action;
        allActions.push( action );

      }

    }

    createPanel();

    animate();

  } );
};

function createPanel() {

  const panel = new GUI( { width: 310 } );

  const folder1 = panel.addFolder( 'Base Actions' );
  const folder2 = panel.addFolder( 'Additive Action Weights' );
  const folder3 = panel.addFolder( 'General Speed' );
  const folder5 = panel.addFolder('Scale and Pos');

  panelSettings = {
    'modify time scale': 1.0
  };

  const settings ={

    'modify step size': 0.05,
    'set mesh scale': 0.07,
    
  };

  const baseNames = [ 'None', ...Object.keys( baseActions ) ];

  for ( let i = 0, l = baseNames.length; i !== l; ++ i ) {

    const name = baseNames[ i ];
    const settings = baseActions[ name ];
    panelSettings[ name ] = function () {

      const currentSettings = baseActions[ currentBaseAction ];
      const currentAction = currentSettings ? currentSettings.action : null;
      const action = settings ? settings.action : null;

      prepareCrossFade( currentAction, action, 0.35 );

    };

    crossFadeControls.push( folder1.add( panelSettings, name ) );

  }

  for ( const name of Object.keys( additiveActions ) ) {

    const settings = additiveActions[ name ];

    panelSettings[ name ] = settings.weight;
    folder2.add( panelSettings, name, 0.0, 1.0, 0.01 ).listen().onChange( function ( weight ) {

      setWeight( settings.action, weight );
      settings.weight = weight;

    } );

  }

  folder3.add( panelSettings, 'modify time scale', 0.0, 1.5, 0.01 ).onChange( modifyTimeScale );
  folder5.add( settings, 'set mesh scale', 0.01, 1, 0.01 ).onChange(setMeshScale);
  

  folder1.open();
  folder2.open();
  folder3.open();
  folder5.open();

  crossFadeControls.forEach( function ( control ) {

    control.setInactive = function () {

      control.domElement.classList.add( 'control-inactive' );

    };

    control.setActive = function () {

      control.domElement.classList.remove( 'control-inactive' );

    };

    const settings = baseActions[ control.property ];

    if ( ! settings || ! settings.weight ) {

      control.setInactive();

    }

  } );

}

function setMeshScale(scale) {

  app.mesh.scale.set(scale,scale,scale);

}

function activateAction( action ) {

  const clip = action.getClip();
  const settings = baseActions[ clip.name ] || additiveActions[ clip.name ];
  setWeight( action, settings.weight );
  action.play();

}

function modifyTimeScale( speed ) {

  mixer.timeScale = speed;

}

function prepareCrossFade( startAction, endAction, duration ) {

  // If the current action is 'idle', execute the crossfade immediately;
  // else wait until the current action has finished its current loop

  if ( currentBaseAction === 'idle' || ! startAction || ! endAction ) {

    executeCrossFade( startAction, endAction, duration );

  } else {

    synchronizeCrossFade( startAction, endAction, duration );

  }

  // Update control colors

  if ( endAction ) {

    const clip = endAction.getClip();
    currentBaseAction = clip.name;

  } else {

    currentBaseAction = 'None';

  }

  crossFadeControls.forEach( function ( control ) {

    const name = control.property;

    if ( name === currentBaseAction ) {

      control.setActive();

    } else {

      control.setInactive();

    }

  } );

}

function synchronizeCrossFade( startAction, endAction, duration ) {

  mixer.addEventListener( 'loop', onLoopFinished );

  function onLoopFinished( event ) {

    if ( event.action === startAction ) {

      mixer.removeEventListener( 'loop', onLoopFinished );

      executeCrossFade( startAction, endAction, duration );

    }

  }

}

function executeCrossFade( startAction, endAction, duration ) {

  // Not only the start action, but also the end action must get a weight of 1 before fading
  // (concerning the start action this is already guaranteed in this place)

  if ( endAction ) {

    setWeight( endAction, 1 );
    endAction.time = 0;

    if ( startAction ) {

      // Crossfade with warping

      startAction.crossFadeTo( endAction, duration, true );

    } else {

      // Fade in

      endAction.fadeIn( duration );

    }

  } else {

    // Fade out

    startAction.fadeOut( duration );

  }

}

// This function is needed, since animationAction.crossFadeTo() disables its start action and sets
// the start action's timeScale to ((start animation's duration) / (end animation's duration))

function setWeight( action, weight ) {

  action.enabled = true;
  action.setEffectiveTimeScale( 1 );
  action.setEffectiveWeight( weight );

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

  // Render loop

  requestAnimationFrame( animate );

  for ( let i = 0; i !== numAnimations; ++ i ) {

    const action = allActions[ i ];
    const clip = action.getClip();
    const settings = baseActions[ clip.name ] || additiveActions[ clip.name ];
    settings.weight = action.getEffectiveWeight();

  }

  // Get the time elapsed since the last frame, used for mixer update

  const mixerUpdateDelta = clock.getDelta();

  // Update the animation mixer, the stats panel, and render this frame

  mixer.update( mixerUpdateDelta );
  
  for ( const mixer of mixers ) mixer.update( mixerUpdateDelta );

  stats.update();

  renderer.render( scene, camera );

}

function handleFileOneSelect(evt) {
  var f = evt.target.files[0];
  var reader = new FileReader();
  reader.onload = (function(theFile) {
    return function(e) {
      console.log(reader.result);
    };
  })(f);
  reader.readAsText(f);
}

function handleFileTwoSelect(evt) {
  var f = evt.target.files[0];
  var reader = new FileReader();
  reader.onload = (function(theFile) {
    return function(e) {
      console.log(reader.result);
    };
  })(f);
  reader.readAsText(f);
}