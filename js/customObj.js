import * as THREE from 'three';

const OBJExample = function ( elementToBindTo,pos_x,pos_z,meshScale,scene ) {

    this.scene=scene;
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
      
      this.scene.add(this.mesh);
      //this.scene.add( this.skeleton );
      this.boneVisHelper = new THREE.SkeletonHelper(this.mesh);
      this.boneVisHelper.material.linewidth = 1;
      this.boneVisHelper.visible = true;
      this.scene.add(this.boneVisHelper);
    },
  
    setUpAnimation: async function (){
  
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
      return;
      //mixers.push(this.mixer);
  
    },
  
  
  
  
  }

  export { OBJExample };

