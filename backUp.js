
var camera, scene, renderer;


init();
animate();

function init() {

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 20);
    camera.position.z = 10;

    scene = new THREE.Scene();

    var bones = [];
    var shoulder = new THREE.Bone();
    var elbow = new THREE.Bone();
    var elbow_right = new THREE.Bone();
    var hand = new THREE.Bone();

    //build root node
    //bones.push(root)

    // for loop
    //var new_node = new THREE.Bone();
    //	parent.add(new_node)
    //bones.push(new_bone)
    //add name

    shoulder.name = 'bone_0'
    elbow.name = 'bone_1'
    elbow_right.name = 'bone_2'
    hand.name = 'bone_3'

    shoulder.add(elbow);
    shoulder.add(elbow_right)
    elbow.add(hand);


    bones.push(shoulder);
    bones.push(elbow);
    bones.push(elbow_right);
    bones.push(hand);

    //bone position is relative to its parent.

    shoulder.position.y = 0;
    elbow.position.y = 2;
    elbow_right.position.y = 2;
    hand.position.y = 5;


    shoulder.position.x = 0;
    elbow.position.x = 2;
    elbow_right.position.x = -2;
    hand.position.x = -4;


    //var armSkeleton = new THREE.Skeleton( bones );
    //var helper = new THREE.SkeletonHelper( bones[ 0 ] );
    //console.log(armSkeleton.bones[1])

    //****create fake skinnedmesh
    const geometry = new THREE.CylinderGeometry(5, 5, 5, 5, 15, 5, 30);

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

    // create skinned mesh and skeleton
    const material = new THREE.MeshBasicMaterial({ color: 0xff6347, wireframe: true });
    const mesh = new THREE.SkinnedMesh(geometry, material);

    //
    //var skeleton = new THREE.SkeletonHelper( mesh );
    //skeleton.visible = true;
    //scene.add( skeleton );

    //skeleton.bones[ 0 ].position.x =-4
    //skeleton.bones[ 1 ].position.x =2
    //skeleton.bones[ 3 ].position.x = -1


    //var mesh = new THREE.Mesh( geometry, material );

    const skeleton = new THREE.Skeleton(bones);
    console.log(skeleton.bones[2].name)
    console.log(skeleton.bones[3].name)

    // see example from THREE.Skeleton

    const rootBone = skeleton.bones[0];
    mesh.add(rootBone);



    // bind the skeleton to the mesh

    mesh.bind(skeleton);
    scene.add(mesh);
    // scene.add( skeleton );
    var skeleton2 = new THREE.SkeletonHelper(mesh);
    skeleton2.visible = true;
    scene.add(skeleton2);


    var boneContainer = new THREE.Group();
    boneContainer.add(bones[0]);
    //boneContainer.add( bones[ 1 ] );
    scene.add(boneContainer);

    // var binding = new THREE.PropertyBinding(armSkeleton);
    //console.log(binding)
    //scene.add( helper );


    var axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);


    // POSITION
    //var positionKF = new THREE.VectorKeyframeTrack( '.position[x]', [ 0, 1, 2 ], [ 0, 0, 0, 0, 0, -3, 0, 0, 0 //] );

    // const times = [ 0, 1,2 ], values = [ 0, 1,-2 ];
    // times here can be delta time, values here can be delta pos , frome one frame to another frame
    //eg at certain time, where is the exact location
    //duration = total frame/ frame rate
    const times = [], values = [], totalFrame = 2700, frameRate = 120, duration = totalFrame / frameRate, tmp = new THREE.Vector3();

    for (let i = 0; i < totalFrame; i++) { //duration = total frame

        times.push(i / frameRate); // i / frame_rate

        const scaleFactor = Math.random() * 1;
        tmp.set(-i / 10, i / 10, 0).
            toArray(values, values.length);

    }
    //console.log(times)
    //console.log(values)

    let tracks = []

    const trackName = '.bones[bone_2].position';

    const track = new THREE.VectorKeyframeTrack(trackName, times, values);

    const trackName2 = '.bones[bone_3].position';

    const track2 = new THREE.VectorKeyframeTrack(trackName2, times, values);

    tracks.push(track)
    tracks.push(track2)
    // create an animation sequence with the tracks
    // If a negative time value is passed, the duration will be calculated from the times of the passed tracks array
    var clip = new THREE.AnimationClip('Action', duration, tracks);
    // aeguemenrt 2 above is total length of clip, eg, 0.088*2730

    // setup the THREE.AnimationMixer
    mixer = new THREE.AnimationMixer(mesh);


    // create a ClipAction and set it to play
    var clipAction = mixer.clipAction(clip);
    clipAction.play();

    clock = new THREE.Clock();


    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

}

function animate() {

    requestAnimationFrame(animate);


    render();

}

function render() {

    var delta = clock.getDelta();

    if (mixer) {

        mixer.update(delta);

    }

    renderer.render(scene, camera);

    //stats.update();

}