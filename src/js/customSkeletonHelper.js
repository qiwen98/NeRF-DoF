import * as THREE from 'three';
import { LineMaterial } from 'three/examples//jsm/lines/LineMaterial.js';
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry";

// import { LineSegments } from '../objects/LineSegments.js';
// import { Matrix4 } from '../math/Matrix4.js';
// import { LineBasicMaterial } from '../materials/LineBasicMaterial.js';
// import { Color } from '../math/Color.js';
// import { Vector3 } from '../math/Vector3.js';
// import { BufferGeometry } from '../core/BufferGeometry.js';
// import { Float32BufferAttribute } from '../core/BufferAttribute.js';

const _vector = /*@__PURE__*/ new THREE.Vector3();
const _boneMatrix = /*@__PURE__*/ new THREE.Matrix4();
const _matrixWorldInv = /*@__PURE__*/ new THREE.Matrix4();


class CustomSkeletonHelper extends THREE.LineSegments {

	constructor( object ,colorOne,colorTwo, isTransparent,renderer) {

		const bones = getBoneList( object );
		const geometry = new THREE.BufferGeometry();

		const vertices = [];
		const colors = [];
		let opacity=0;
		if(!isTransparent)
		{
			opacity=1;
		}
		
		


		const color1 = colorOne;
		const color2 = colorTwo;

		for ( let i = 0; i < bones.length; i ++ ) {

			const bone = bones[ i ];

			if ( bone.parent && bone.parent.isBone ) {

				vertices.push( bone.parent.position.x, bone.parent.position.y, bone.parent.position.z );
				vertices.push( bone.position.x, bone.position.y, bone.position.z );
				colors.push( color1.r, color1.g, color1.b );
				colors.push( color2.r, color2.g, color2.b );


			}

		}

		geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );



		let geometry2 = new LineSegmentsGeometry().setPositions( Float32Array.from(vertices));
		const resolution = new THREE.Vector2();
		renderer.getSize(resolution);
		const material2 = new LineMaterial( {

			color: 0xffffff,
			linewidth: 0.001, // in world units with size attenuation, pixels otherwise
			vertexColors: true,
			
			//resolution:  // to be set by renderer, eventually
			dashed: false,
			resolution,
			
			alphaToCoverage: true,

		} );
		const material = new THREE.LineBasicMaterial( { vertexColors: true, linewidth: 10, depthTest: false, depthWrite: false, toneMapped: false, transparent: true, opacity:opacity } );
        //////////////////////////////set the points
		

		super( geometry, material);

 

		this.type = 'SkeletonHelper';
		this.isSkeletonHelper = true;

		this.root = object;
		this.bones = bones;

		this.matrix = object.matrixWorld;
		this.matrixAutoUpdate = false;

	}

	updateMatrixWorld( force ) {

		const bones = this.bones;

		const geometry = this.geometry;
		const position = geometry.getAttribute( 'position' );


		_matrixWorldInv.copy( this.root.matrixWorld ).invert();

		for ( let i = 0, j = 0; i < bones.length; i ++ ) {

			const bone = bones[ i ];

			if ( bone.parent && bone.parent.isBone ) {

				_boneMatrix.multiplyMatrices( _matrixWorldInv, bone.matrixWorld );
				_vector.setFromMatrixPosition( _boneMatrix );
				position.setXYZ( j, _vector.x, _vector.y, _vector.z );

				_boneMatrix.multiplyMatrices( _matrixWorldInv, bone.parent.matrixWorld );
				_vector.setFromMatrixPosition( _boneMatrix );
				position.setXYZ( j + 1, _vector.x, _vector.y, _vector.z );

				j += 2;

			}

		}


		geometry.getAttribute( 'position' ).needsUpdate = true;
		

		super.updateMatrixWorld( force );

	}

}


function getBoneList( object ) {

	const boneList = [];

	if ( object && object.isBone ) {

		boneList.push( object );

	}

	for ( let i = 0; i < object.children.length; i ++ ) {

		boneList.push.apply( boneList, getBoneList( object.children[ i ] ) );

	}

	return boneList;

}


export { CustomSkeletonHelper };