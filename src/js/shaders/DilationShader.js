import {
	Vector2
} from 'three';;

/**
 * Dilation Filter
 * Inspired by http://pieper.github.io/sites/glimp/dilate.html
 */

const DilationShader = {

	uniforms: {

		'tDiffuse': { value: null },
		'sourceTextureSize': { value: new Vector2( 1242, 1042) },
		'sourceTexelSize': { value: new Vector2( 1/1242, 1/1042 ) },
		'focusPoint': { value: new Vector2( 0, 0.0 ) }



	},

	vertexShader: /* glsl */`
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,

	fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform vec2 sourceTextureSize;
        uniform vec2 sourceTexelSize;
        uniform vec2 focusPoint;

		varying vec2 vUv;

        void main(void) {
            vec4 c = texture2D(tDiffuse,vUv);
            vec4 dc = c;
          
            // only dilate to the right of the mouse
            if (vUv.x > focusPoint.x)
            {
              vec3 cc;
              //read out the texels
              for (int i=-1; i <= 1; ++i)
              {
                for (int j=-1; j <= 1; ++j)
                {
                  // color at pixel in the neighborhood
                  vec2 coord = vUv.xy + vec2(float(i), float(j))*sourceTexelSize.xy;
                  cc = texture2D(tDiffuse, coord).rgb;
          
                  // dilate = max, erode = min
                  dc.rgb = max(cc.rgb, dc.rgb);
                }
              }
            }
          
            gl_FragColor = dc;
          }
        `

};

export { DilationShader };