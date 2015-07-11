import { THREE$Object3D } from '../core/Object3D';
import { THREE$DoubleSide, THREE$BackSide } from '../Three';
import { THREE$MeshFaceMaterial } from '../materials/MeshFaceMaterial';
import { THREE$Geometry } from '../core/Geometry';
import { THREE$Triangle } from '../math/Triangle';
import { THREE$Face3 } from '../core/Face3';
import { THREE$BufferGeometry } from '../core/BufferGeometry';
import { THREE$Vector3 } from '../math/Vector3';
import { THREE$Sphere } from '../math/Sphere';
import { THREE$Ray } from '../math/Ray';
import { THREE$Matrix4 } from '../math/Matrix4';
import { THREE$MeshBasicMaterial } from '../materials/MeshBasicMaterial';

/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author mikael emtinger / http://gomo.se/
 * @author jonobr1 / http://jonobr1.com/
 */

function THREE$Mesh ( geometry, material ) {
	this.isMesh = true;

	THREE$Object3D.call( this );

	this.type = 'Mesh';

	this.geometry = geometry !== undefined ? geometry : new THREE$Geometry();
	this.material = material !== undefined ? material : new THREE$MeshBasicMaterial( { color: Math.random() * 0xffffff } );

	this.updateMorphTargets();

};

THREE$Mesh.prototype = Object.create( THREE$Object3D.prototype );
THREE$Mesh.prototype.constructor = THREE$Mesh;

THREE$Mesh.prototype.updateMorphTargets = function () {

	if ( this.geometry.morphTargets !== undefined && this.geometry.morphTargets.length > 0 ) {

		this.morphTargetBase = - 1;
		this.morphTargetForcedOrder = [];
		this.morphTargetInfluences = [];
		this.morphTargetDictionary = {};

		for ( var m = 0, ml = this.geometry.morphTargets.length; m < ml; m ++ ) {

			this.morphTargetInfluences.push( 0 );
			this.morphTargetDictionary[ this.geometry.morphTargets[ m ].name ] = m;

		}

	}

};

THREE$Mesh.prototype.getMorphTargetIndexByName = function ( name ) {

	if ( this.morphTargetDictionary[ name ] !== undefined ) {

		return this.morphTargetDictionary[ name ];

	}

	console.warn( 'THREE.Mesh.getMorphTargetIndexByName: morph target ' + name + ' does not exist. Returning 0.' );

	return 0;

};


THREE$Mesh.prototype.raycast = ( function () {

	var inverseMatrix = new THREE$Matrix4();
	var ray = new THREE$Ray();
	var sphere = new THREE$Sphere();

	var vA = new THREE$Vector3();
	var vB = new THREE$Vector3();
	var vC = new THREE$Vector3();

	return function ( raycaster, intersects ) {

		var geometry = this.geometry;
		var material = this.material;

		if ( material === undefined ) return;

		// Checking boundingSphere distance to ray

		if ( geometry.boundingSphere === null ) geometry.computeBoundingSphere();

		sphere.copy( geometry.boundingSphere );
		sphere.applyMatrix4( this.matrixWorld );

		if ( raycaster.ray.isIntersectionSphere( sphere ) === false ) {

			return;

		}

		// Check boundingBox before continuing

		inverseMatrix.getInverse( this.matrixWorld );
		ray.copy( raycaster.ray ).applyMatrix4( inverseMatrix );

		if ( geometry.boundingBox !== null ) {

			if ( ray.isIntersectionBox( geometry.boundingBox ) === false ) {

				return;

			}

		}

		var a, b, c;

		if ( (geometry && geometry.isBufferGeometry) ) {

			var attributes = geometry.attributes;

			if ( attributes.index !== undefined ) {

				var indices = attributes.index.array;
				var positions = attributes.position.array;
				var offsets = geometry.offsets;

				if ( offsets.length === 0 ) {

					offsets = [ { start: 0, count: indices.length, index: 0 } ];

				}

				for ( var oi = 0, ol = offsets.length; oi < ol; ++ oi ) {

					var start = offsets[ oi ].start;
					var count = offsets[ oi ].count;
					var index = offsets[ oi ].index;

					for ( var i = start, il = start + count; i < il; i += 3 ) {

						a = index + indices[ i ];
						b = index + indices[ i + 1 ];
						c = index + indices[ i + 2 ];

						vA.fromArray( positions, a * 3 );
						vB.fromArray( positions, b * 3 );
						vC.fromArray( positions, c * 3 );

						if ( material.side === THREE$BackSide ) {

							var intersectionPoint = ray.intersectTriangle( vC, vB, vA, true );

						} else {

							var intersectionPoint = ray.intersectTriangle( vA, vB, vC, material.side !== THREE$DoubleSide );

						}

						if ( intersectionPoint === null ) continue;

						intersectionPoint.applyMatrix4( this.matrixWorld );

						var distance = raycaster.ray.origin.distanceTo( intersectionPoint );

						if ( distance < raycaster.near || distance > raycaster.far ) continue;

						intersects.push( {

							distance: distance,
							point: intersectionPoint,
							face: new THREE$Face3( a, b, c, THREE$Triangle.normal( vA, vB, vC ) ),
							faceIndex: Math.floor( i / 3 ), // triangle number in indices buffer semantics
							object: this

						} );

					}

				}

			} else {

				var positions = attributes.position.array;

				for ( var i = 0, j = 0, il = positions.length; i < il; i += 3, j += 9 ) {

					a = i;
					b = i + 1;
					c = i + 2;

					vA.fromArray( positions, j );
					vB.fromArray( positions, j + 3 );
					vC.fromArray( positions, j + 6 );

					if ( material.side === THREE$BackSide ) {

						var intersectionPoint = ray.intersectTriangle( vC, vB, vA, true );

					} else {

						var intersectionPoint = ray.intersectTriangle( vA, vB, vC, material.side !== THREE$DoubleSide );

					}

					if ( intersectionPoint === null ) continue;

					intersectionPoint.applyMatrix4( this.matrixWorld );

					var distance = raycaster.ray.origin.distanceTo( intersectionPoint );

					if ( distance < raycaster.near || distance > raycaster.far ) continue;

					intersects.push( {

						distance: distance,
						point: intersectionPoint,
						face: new THREE$Face3( a, b, c, THREE$Triangle.normal( vA, vB, vC ) ),
						index: Math.floor(i/3), // triangle number in positions buffer semantics
						object: this

					} );

				}

			}

		} else if ( (geometry && geometry.isGeometry) ) {

			var isFaceMaterial = (material && material.isMeshFaceMaterial);
			var materials = isFaceMaterial === true ? material.materials : null;

			var vertices = geometry.vertices;
			var faces = geometry.faces;

			for ( var f = 0, fl = faces.length; f < fl; f ++ ) {

				var face = faces[ f ];
				var faceMaterial = isFaceMaterial === true ? materials[ face.materialIndex ] : material;

				if ( faceMaterial === undefined ) continue;

				a = vertices[ face.a ];
				b = vertices[ face.b ];
				c = vertices[ face.c ];

				if ( faceMaterial.morphTargets === true ) {

					var morphTargets = geometry.morphTargets;
					var morphInfluences = this.morphTargetInfluences;

					vA.set( 0, 0, 0 );
					vB.set( 0, 0, 0 );
					vC.set( 0, 0, 0 );

					for ( var t = 0, tl = morphTargets.length; t < tl; t ++ ) {

						var influence = morphInfluences[ t ];

						if ( influence === 0 ) continue;

						var targets = morphTargets[ t ].vertices;

						vA.x += ( targets[ face.a ].x - a.x ) * influence;
						vA.y += ( targets[ face.a ].y - a.y ) * influence;
						vA.z += ( targets[ face.a ].z - a.z ) * influence;

						vB.x += ( targets[ face.b ].x - b.x ) * influence;
						vB.y += ( targets[ face.b ].y - b.y ) * influence;
						vB.z += ( targets[ face.b ].z - b.z ) * influence;

						vC.x += ( targets[ face.c ].x - c.x ) * influence;
						vC.y += ( targets[ face.c ].y - c.y ) * influence;
						vC.z += ( targets[ face.c ].z - c.z ) * influence;

					}

					vA.add( a );
					vB.add( b );
					vC.add( c );

					a = vA;
					b = vB;
					c = vC;

				}

				if ( faceMaterial.side === THREE$BackSide ) {

					var intersectionPoint = ray.intersectTriangle( c, b, a, true );

				} else {

					var intersectionPoint = ray.intersectTriangle( a, b, c, faceMaterial.side !== THREE$DoubleSide );

				}

				if ( intersectionPoint === null ) continue;

				intersectionPoint.applyMatrix4( this.matrixWorld );

				var distance = raycaster.ray.origin.distanceTo( intersectionPoint );

				if ( distance < raycaster.near || distance > raycaster.far ) continue;

				intersects.push( {

					distance: distance,
					point: intersectionPoint,
					face: face,
					faceIndex: f,
					object: this

				} );

			}

		}

	};

}() );

THREE$Mesh.prototype.clone = function ( object, recursive ) {

	if ( object === undefined ) object = new THREE$Mesh( this.geometry, this.material );

	THREE$Object3D.prototype.clone.call( this, object, recursive );

	return object;

};

THREE$Mesh.prototype.toJSON = function ( meta ) {

	var data = THREE$Object3D.prototype.toJSON.call( this, meta );

	// only serialize if not in meta geometries cache
	if ( meta.geometries[ this.geometry.uuid ] === undefined ) {
		meta.geometries[ this.geometry.uuid ] = this.geometry.toJSON( meta );
	}

	// only serialize if not in meta materials cache
	if ( meta.materials[ this.material.uuid ] === undefined ) {
		meta.materials[ this.material.uuid ] = this.material.toJSON( meta );
	}

	data.object.geometry = this.geometry.uuid;
	data.object.material = this.material.uuid;

	return data;

};


export { THREE$Mesh };