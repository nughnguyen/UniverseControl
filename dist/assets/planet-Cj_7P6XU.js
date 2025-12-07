import{G as P,T as y,S as c,g as R,P as S,M as m,h as d,j as b,O as G,i as T,c as B,d as t,m as r,e as u,s as I,r as E,f as Z}from"./hand-tracking-Chua8BcC.js";let o,l=[];const s=new P,j=()=>{const e=new y().load("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg"),h=new c(1,256,256),g=new R({uniforms:{earthTexture:{value:e}},vertexShader:`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 4.0 * (10.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,fragmentShader:`
            uniform sampler2D earthTexture;
            varying vec2 vUv;
            void main() {
                vec4 color = texture2D(earthTexture, vUv);
                gl_FragColor = vec4(color.rgb, 1.0);
            }
        `,transparent:!0});o=new S(h,g);const p=new m(new c(.99,64,64),new d({color:0}));o.add(p),s.add(o);const x=40,w=new b(.05,.05,.05),M=new d({color:65535});for(let i=0;i<x;i++){const a=new G;a.rotation.set(Math.random()*Math.PI*2,Math.random()*Math.PI*2,Math.random()*Math.PI*2);const n=new m(w,M),f=1.3+Math.random()*.7;n.position.set(f,0,0),a.add(n),s.add(a),l.push({pivot:a,mesh:n,speed:.002+Math.random()*.005})}};function X(e){j(),e.add(s)}function Y(){o&&(o.rotation.y+=5e-4),l.forEach(e=>{e.pivot.rotation.z+=e.speed})}const _=document.getElementById("canvas-container"),z=document.getElementById("webcam"),U=document.getElementById("status-badge"),k=document.getElementById("status-text");T(_);X(r);B(z,{badge:U,text:k});t.targetZoom=3.5;t.currentZoom=3.5;t.targetRotX=0;t.targetRotY=0;const v=()=>{t.currentRotX+=(t.targetRotX-t.currentRotX)*.05,t.currentRotY+=(t.targetRotY-t.currentRotY)*.05,t.currentZoom+=(t.targetZoom-t.currentZoom)*.05,r.rotation.x=t.currentRotX,r.rotation.y=t.currentRotY,u.position.z=t.currentZoom,Y(),I.rotation.y-=1e-4,E.render(Z,u),window.requestAnimationFrame(v)};v();
