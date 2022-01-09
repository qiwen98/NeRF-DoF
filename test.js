import './style.css';
import * as THREE from 'three';

import Stats from 'three/examples//jsm/libs/stats.module.js';
import { GUI } from 'three/examples//jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples//jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples//jsm/loaders/GLTFLoader.js';
import { SVGLoader } from 'three/examples//jsm/loaders/SVGLoader.js';
import { FontLoader } from 'three/examples//jsm/loaders/FontLoader.js';

let scene, renderer, camera, stats;
let model, skeleton, mixer, robotMixer, clock;

// declare global vars
const crossFadeControls = [];
let animData=[];
let bones=[] ;
//fake skin mesh geometry
const geometry = new THREE.CylinderGeometry(5, 5, 5, 5, 15, 5, 30);
let mesh;

//variables for on panels control
var clipAction;
let singleStepMode = false;
let sizeOfNextStep = 0;
let MeshScale = 0.07;


let currentBaseAction = 'idle';
const allActions = [];
const baseActions = {
  idle: { weight: 0 },
  walk: { weight: 0 },
  run: { weight: 1 }
};
const additiveActions = {
  sneak_pose: { weight: 1 },
  sad_pose: { weight: 0 },
  agree: { weight: 0 },
  headShake: { weight: 0 }
};
let panelSettings, numAnimations;

init();

function init() {

  const container = document.getElementById('container');
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);
  scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff);
  dirLight.position.set(3, 10, 10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 2;
  dirLight.shadow.camera.bottom = - 2;
  dirLight.shadow.camera.left = - 2;
  dirLight.shadow.camera.right = 2;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 40;
  scene.add(dirLight);

  



  // ground

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
  mesh.rotation.x = - Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);


  // load the robot model 
  const loader = new GLTFLoader();
  loader.load('models/gltf/Xbot.glb', function (gltf) {

    model = gltf.scene;   
    model.position.x =1
    scene.add(model);
    model.traverse(function (object) {

      if (object.isMesh) object.castShadow = true;

    });
    skeleton = new THREE.SkeletonHelper(model);
    skeleton.visible = false;
    scene.add(skeleton);
    const animations = gltf.animations;
    robotMixer = new THREE.AnimationMixer(model);
    numAnimations = animations.length;
    for (let i = 0; i !== numAnimations; ++i) {

      let clip = animations[i];
      const name = clip.name;

      if (baseActions[name]) {

        const action = robotMixer.clipAction(clip);
        activateAction(action);
        baseActions[name].action = action;
        allActions.push(action);

      } else if (additiveActions[name]) {

        // Make the clip additive and remove the reference frame

        THREE.AnimationUtils.makeClipAdditive(clip);

        if (clip.name.endsWith('_pose')) {

          clip = THREE.AnimationUtils.subclip(clip, clip.name, 2, 3, 30);

        }

        const action = robotMixer.clipAction(clip);
        activateAction(action);
        additiveActions[name].action = action;
        allActions.push(action);

      }

    }
    //create the panel
    createPanel();



    //load the bvh anim data; and also create the skeletons;
    loadBVHdata();
    //test
    // loadBVHdata();



    //update every frame
    animate();

  });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100);
  camera.position.set(-1, 2, 5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.target.set(0, 1, 0);
  controls.update();

  stats = new Stats();
  container.appendChild(stats.dom);

  window.addEventListener('resize', onWindowResize);

}

function setUpAnimation(head,tail)
{
  // times here can be delta time, values here can be delta pos , frome one frame to another frame
    //eg at certain time, where is the exact location
    //duration = total frame/ frame rate
    const totalFrame = animData[0][0].length, frameRate = 120, duration = totalFrame / frameRate;
    var tracks = [];



    const times = [], values = [], tmp = new THREE.Vector3();
    // ********* node 0 dont have parent !!!! *****
    // for each frame 
    for (let frame_i = 0; frame_i<totalFrame; frame_i++)
    {
        times.push(frame_i / frameRate); // i / frame_rate

        //add in location data



        let pos_x=animData[0][0][frame_i]
        let pos_y=animData[1][0][frame_i]
        let pos_z=animData[2][0][frame_i]


        tmp.set(pos_x, pos_y, pos_z).
            toArray(values, values.length);
        
    }

    const trackName = '.bones[bone_0].position';
    const track = new THREE.VectorKeyframeTrack(trackName, times, values);
    tracks.push(track);

    // ********* node 0 end!!!! *****


    //for each bone node other than   
    for (let i = 1; i<animData[0].length; i++)
    {

        const times = [], values = [], tmp = new THREE.Vector3();
        
        // for each frame 
        for (let frame_i = 0; frame_i<totalFrame; frame_i++)
        {
            times.push(frame_i / frameRate); // i / frame_rate

            //add in location data
            //current relative pos equal to own pos - parent pos 
            let PI =head[i-1];
            let I = tail[i-1];

            //console.log (PI+"->"+I);

            let pos_x=animData[0][I][frame_i]-animData[0][PI][frame_i];
            let pos_y=animData[1][I][frame_i]-animData[1][PI][frame_i];
            let pos_z=animData[2][I][frame_i]-animData[2][PI][frame_i];


            tmp.set(pos_x, pos_y, pos_z).
                toArray(values, values.length);
            
        }

        const trackName = '.bones[bone_'+i+'].position';

        const track = new THREE.VectorKeyframeTrack(trackName, times, values);

        tracks.push(track)
    }



    //console.log(times)
    //console.log(values)

    

    // const trackName = '.bones[bone_2].position';

    // const track = new THREE.VectorKeyframeTrack(trackName, times, values);

    // const trackName2 = '.bones[bone_3].position';

    // const track2 = new THREE.VectorKeyframeTrack(trackName2, times, values);

    // tracks.push(track)
    // tracks.push(track2)
    // create an animation sequence with the tracks
    // If a negative time value is passed, the duration will be calculated from the times of the passed tracks array
    var clip = new THREE.AnimationClip('Action', duration, tracks);
    // aeguemenrt 2 above is total length of clip, eg, 0.088*2730

     // setup the THREE.AnimationMixer
     mixer = new THREE.AnimationMixer(mesh);


     // create a ClipAction and set it to play
     clipAction = mixer.clipAction(clip);
     clipAction.play();
}

function createFakeSkinMesh()
{
  

    // create the skin indices and skin weights

    const position = geometry.attributes.position;

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

    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
}

function createSkinMesh()
{

  createFakeSkinMesh();
  // create skinned mesh and skeleton
  const material = new THREE.MeshBasicMaterial({ color: 0xff6347, wireframe: true });
  mesh = new THREE.SkinnedMesh(geometry, material);

  const skeleton = new THREE.Skeleton(bones);

  // see example from THREE.Skeleton

  const rootBone = skeleton.bones[0];
  mesh.add(rootBone);
  mesh.visible=false;
  // bind the skeleton to the mesh

  mesh.bind(skeleton);
  mesh.position.set(0,1.15,0);
  mesh.scale.set(MeshScale,MeshScale,MeshScale);
  
  scene.add(mesh);
  // scene.add( skeleton );
  var skeletonVis = new THREE.SkeletonHelper(mesh);
  skeletonVis.material.linewidth = 1;
  skeletonVis.visible = true;
  scene.add(skeletonVis);
}




function createSkeleton(head,tail,skeletonObj){



  //build root node
  let rootNode = new THREE.Bone();
  rootNode.name = 'bone_0';
  bones.push(rootNode);

  // set root node position
  let pos_x=animData[0][0][0];
  let pos_y=animData[1][0][0];
  let pos_z=animData[2][0][0];
  rootNode.position.set(pos_x,pos_y,pos_z);

  //sanity check
  console.log(rootNode.position);
  console.log(animData[2][2][2033]);
  console.log(animData[0][1][0]);

    // for loop // for the rest nodes
    for (let i = 1; i !== head.length+1; ++i)
    {
        let new_node = new THREE.Bone();

        //	parent.add(new_node)
        bones[head[i-1]].add(new_node)
        //console.log(bones[head[i]])
        //add name
        new_node.name = 'bone_'+tail[i-1];
        //console.log(new_node.name)
        //bones.push(new_bone)
        bones.push(new_node)
        console.log(i)

        //add in location data
        //current relative pos equal to own pos - parent pos 
        let PI =head[i-1];

        pos_x=animData[0][i][0]-animData[0][PI][0];
        pos_y=animData[1][i][0]-animData[1][PI][0];
        pos_z=animData[2][i][0]-animData[2][PI][0];


        //console.log(pos_x,pos_y,pos_z);
        new_node.position.set(pos_x,pos_y,pos_z);
        
    }
    //     var skeleton = new THREE.SkeletonHelper(bones[0] );
    // skeleton.visible = true;
    // console.log(skeleton.color);
    // scene.add( skeleton );

    
    // var boneContainer = new THREE.Group();
    // boneContainer.add(bones[0]);
    // boneContainer.scale.set(.1,.1,.1);
    // boneContainer.position.set(1,1.6,0);
  

    // //boneContainer.add( bones[ 1 ] );
    // scene.add(boneContainer);



    // var axesHelper = new THREE.AxesHelper(10);
    // scene.add(axesHelper);
    
}

function loadBVHdata(){



      //load file
      const loader2 = new THREE.FileLoader();
      //load a text file and output the result to the console
      loader2.load(
        // resource URL
        "models/files/output.json",
        // onLoad callback
        function ( data ) {
          // output the text to the console
          //console.log( data );
          animData= JSON.parse(data); 
          //console.log(animData)
          const dimensions = [ animData.length, animData[0].length ,animData[0][0].length];
          console.log( dimensions);

           //connection array;
          if(skeletonObj.is_hand)
          {


          }

          else
          {
            var head=[0,1,2,3,4,5,0,7,8,9,10,11,0, 13,14,15,16,17,18,15,20,21,22,23,24,25,23,27,15,29,30,31,32,33,34,32,36];
            var tail=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37];
          }



          createSkeleton(head,tail);
          createSkinMesh();
          setUpAnimation(head,tail);
          // create 
          //scene.add( obj );
        },
        // onProgress callback
        function ( xhr ) {
          console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
        },
        // onError callback
        function ( err ) {
          console.error( 'An error happened' );
        }
        );

}

function createPanel() {

  const panel = new GUI({ width: 310 });

  const folder1 = panel.addFolder('Base Actions');
  const folder2 = panel.addFolder( 'Activation/Deactivation' );
  const folder3 = panel.addFolder('Additive Action Weights');
  const folder4 = panel.addFolder('General Speed');
  const folder5 = panel.addFolder('Scale and Pos');



  panelSettings = {
    'modify time scale': 1.0
  };

  const baseNames = ['None', ...Object.keys(baseActions)];

  for (let i = 0, l = baseNames.length; i !== l; ++i) {

    const name = baseNames[i];
    const settings = baseActions[name];
    panelSettings[name] = function () {

      const currentSettings = baseActions[currentBaseAction];
      const currentAction = currentSettings ? currentSettings.action : null;
      const action = settings ? settings.action : null;

      prepareCrossFade(currentAction, action, 0.35);

    };

    crossFadeControls.push(folder1.add(panelSettings, name));

  }

  const settings ={
    'deactivate all': deactivateAllActions,
		'activate all': activateAllActions,
    'pause/continue': pauseContinue,
    'make single step': toSingleStepMode,
    'modify step size': 0.05,
    'set mesh scale': 0.07,
    
  };

  folder2.add( settings, 'deactivate all' );
  folder2.add( settings, 'activate all' );
  folder2.add( settings, 'pause/continue' );
  folder2.add( settings, 'make single step' );
  folder2.add( settings, 'modify step size', 0.01, 0.1, 0.001 );
  folder5.add( settings, 'set mesh scale', 0.01, 1, 0.01 ).onChange(setMeshScale);;
  

  function deactivateAllActions() {

      clipAction.stop();

  }

  function activateAllActions() {

    clipAction.play();

  }

  function pauseContinue() {

    if ( singleStepMode ) {

      singleStepMode = false;
      unPauseAllActions();

    } else {

      if ( clipAction.paused ) {

        unPauseAllActions();

      } else {

        pauseAllActions();

      }

    }

  }

  function pauseAllActions() {

      clipAction.paused = true;

  }

  function unPauseAllActions() {

      clipAction.paused = false;

  }

  function toSingleStepMode() {

    unPauseAllActions();

    singleStepMode = true;
    sizeOfNextStep = settings[ 'modify step size' ];

  }

  function setMeshScale(scale) {

    mesh.scale.set(scale,scale,scale);

  }



  for (const name of Object.keys(additiveActions)) {

    const settings = additiveActions[name];

    panelSettings[name] = settings.weight;
    folder3.add(panelSettings, name, 0.0, 1.0, 0.01).listen().onChange(function (weight) {

      setWeight(settings.action, weight);
      settings.weight = weight;

    });

  }

  folder4.add(panelSettings, 'modify time scale', 0.0, 1.5, 0.01).onChange(modifyTimeScale);

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

function activateAction(action) {

  const clip = action.getClip();
  const settings = baseActions[clip.name] || additiveActions[clip.name];
  setWeight(action, settings.weight);
  action.play();

}

function modifyTimeScale(speed) {

  mixer.timeScale = speed;

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

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

  // Render loop

  requestAnimationFrame(animate);

  render();

  

}

function render() {

  for (let i = 0; i !== numAnimations; ++i) {

    const action = allActions[i];
    const clip = action.getClip();
    const settings = baseActions[clip.name] || additiveActions[clip.name];
    settings.weight = action.getEffectiveWeight();

  }

  // Get the time elapsed since the last frame, used for mixer update

  let mixerUpdateDelta = clock.getDelta();

  if ( singleStepMode ) {

    mixerUpdateDelta = sizeOfNextStep;
    sizeOfNextStep = 0;

  }

  // Update the animation mixer, the stats panel, and render this frame

  mixer.update(mixerUpdateDelta);
  robotMixer.update(mixerUpdateDelta);

  stats.update();

  renderer.render(scene, camera);

}
