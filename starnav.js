import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

raycaster.params.Points.threshold = 0.1;

const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
const starVertices = [];
for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

const allNodes = [];

function getRandomPointOnSphere(centerPoint, distance) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const x = centerPoint.x + distance * Math.sin(phi) * Math.cos(theta);
    const y = centerPoint.y + distance * Math.sin(phi) * Math.sin(theta);
    const z = centerPoint.z + distance * Math.cos(phi);
    return { x, y, z };
}

function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 25;
    context.font = `${fontSize}px Courier New`;
    const textMetrics = context.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;
    canvas.width = textWidth + 20;
    canvas.height = textHeight + 20;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `${fontSize}px Courier New`;
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    const scaleFactor = 0.005;
    sprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1);
    return sprite;
}

function checkCollision(node1, node2) {
    const distance = node1.object.position.distanceTo(node2.object.position);
    return distance < (node1.radius + node2.radius);
}

function resolveCollision(node) {
    let attempts = 0;
    const maxAttempts = 100;
    while (attempts < maxAttempts) {
        let collision = false;
        for (const otherNode of allNodes) {
            if (node !== otherNode && checkCollision(node, otherNode)) {
                collision = true;
                break;
            }
        }
        if (!collision) {
            return true;
        }
        if (!node.isRoot) {
            let newPos = getRandomPointOnSphere(node.parent.object.position, 2);
            node.object.position.set(newPos.x, newPos.y, newPos.z);
            node.edges_lines.position.copy(node.object.position);
            node.nameSprite.position.copy(node.object.position);
            node.nameSprite.position.y += node.radius + 0.1;
        }
        attempts++;
    }
    return false;
}

class StarNode {
    constructor(parent, radius, name, type, coordinates, description) {
        this.parent = parent;
        this.isRoot = parent === null;
        this.radius = radius;
        this.geometry = new THREE.IcosahedronGeometry(this.radius);
        this.edges = new THREE.EdgesGeometry(this.geometry);
        this.edges_lines = new THREE.LineSegments(this.edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
        this.material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.5,
            roughness: 0,
            iridescence: 1,
            iridescenceIOR: 2.135,
            iridescenceThicknessRange: [100, 400]
        });
        this.object = new THREE.Mesh(this.geometry, this.material);
        let rot = Math.random() * 2 * Math.PI;
        this.object.rotation.x = rot;
        this.object.rotation.y = rot;
        this.object.rotation.z = rot;
        this.edges_lines.rotation.x = rot;
        this.edges_lines.rotation.y = rot;
        this.edges_lines.rotation.z = rot;
        this.name = name;
        this.type = type;
        this.coordinates = coordinates;
        this.description = description;
        this.object.userData = { starNode: this };
        this.edges_lines.userData = { starNode: this };
        this.edges.userData = { starNode: this };
        this.nameSprite = createTextSprite(this.name);
    }

    draw() {
        if (this.isRoot) {
            this.object.position.set(0, 0, 0);
            this.edges_lines.position.set(0, 0, 0);
            this.nameSprite.position.copy(this.object.position);
            this.nameSprite.position.y += this.radius + 0.5;
            scene.add(this.object);
            scene.add(this.edges_lines);
            scene.add(this.nameSprite);
            allNodes.push(this);
        } else {
            let randPos = getRandomPointOnSphere(this.parent.object.position, 2);
            this.object.position.set(randPos.x, randPos.y, randPos.z);
            this.edges_lines.position.copy(this.object.position);
            this.nameSprite.position.copy(this.object.position);
            this.nameSprite.position.y += this.radius + 0.1;
            if (resolveCollision(this)) {
                scene.add(this.object);
                scene.add(this.edges_lines);
                scene.add(this.nameSprite);
                this.connecting_line_geo = new THREE.BufferGeometry().setFromPoints([this.object.position, this.parent.object.position]);
                this.connecting_line = new THREE.Line(this.connecting_line_geo, new THREE.LineBasicMaterial({ color: 0xffffff }));
                scene.add(this.connecting_line);
                allNodes.push(this);
            } else {
                console.warn(`Failed to place node ${this.name} without collisions`);
            }
        }
    }

    animateFrame() {
        this.object.rotation.x += 0.002;
        this.object.rotation.y += 0.002;
        this.edges_lines.rotation.x += 0.002;
        this.edges_lines.rotation.y += 0.002;
        this.geometry.computeBoundingSphere();
        this.edges.computeBoundingSphere();
    }
}

const rootnode = new StarNode(
    null,
    0.5,
    "LILAF",
    "GALAXY",
    "(l = 237.8°, b = +42.3°, d = 3,850,000 ly)",
    "LILAF IS A FULL-STACK PROGRAMMER AND MUSIC PRODUCER SPECIALIZING IN JAVASCRIPT AND RUST. HE CREATES BREAKCORE, JUNGLE, AND OTHER MUSIC WHILE FOCUSING ON DESKTOP, WEB, AND LOW-LEVEL PROGRAMMING. HIS PASSION LIES IN BLENDING TECHNOLOGY WITH CREATIVITY.",
    2
);
rootnode.draw();

const projectsnode = new StarNode(
    rootnode,
    0.3,
    "PROJECTS",
    "STAR",
    "(l = 263.2°, b = +43.3°, d = 3,850,256 ly)",
    "LILAF'S CURRENT PROJECTS, INCLUDING THOSE FROM STRAWBERRY MILK SOFTWARE.",
    1
);
projectsnode.draw();

const lavanode = new StarNode(
    projectsnode,
    0.2,
    "LAVA",
    "PLANET",
    "(l = 263.2°, b = +43.3°, d = 3,850,256 ly)",
    "WEB BROWSER WITH EASY CUSTOMIZABILITY AND USER FREEDOM. <a href=\"https://strawberrymilksoftware.com/products/lava\">ACCESS</a>",
    1
);
lavanode.draw();

const xenosnode = new StarNode(
    projectsnode,
    0.2,
    "XENOS",
    "PLANET",
    "(l = 265.1°, b = +41.2/°, d = 3,850,256 ly)",
    "REALISTIC AND FUNCTIONAL WEB BROWSER OPERATING SYSTEM",
    1
);
xenosnode.draw();

const harmonicshiftnode = new StarNode(
    projectsnode,
    0.2,
    "HARMONIC_SHIFT",
    "PLANET",
    "(l = 265.1°, b = +40.2/°, d = 3,850,256 ly)",
    "BROWSER RHYTHM GAME",
    1
);
harmonicshiftnode.draw();


const strawberrymilknode = new StarNode(
    rootnode,
    0.3,
    "STRAWBERRY MILK SOFTWARE",
    "STAR",
    "(l = 252.2°, b = +14.3°, d = 3,850,101 ly)",
    "STRAWBERRY MILK SOFTWARE IS A SMALL DEVELOPER GROUP DEDICATED TO ONE THING: FREE-AND-OPEN-SOURCE SOFTWARE (FOSS). THEY AIM TO MAKE SOFTWARE A BETTER PLACE WHILE CREATING AND IMPROVING ALONG THE WAY. BY USING STRAWBERRY MILK SOFTWARE PRODUCTS, USERS CONTRIBUTE TO THEIR FOSS MISSION, AND THE TEAM APPRECIATES THEIR SUPPORT. <a href=\"https://strawberrymilksoftware.com/\">ACCESS</a>",
    1
);
strawberrymilknode.draw();

const musicnode = new StarNode(
    rootnode,
    0.3,
    "MUSIC",
    "STAR",
    "(l = 266.2°, b = +22.3°, d = 3,850,300 ly)",
    "LILAF'S MUSIC",
    1
);
musicnode.draw();



const spotifynode = new StarNode(
    musicnode,
    0.2,
    "SPOTIFY",
    "PLANET",
    "(l = 265.1°, b = +40.2/°, d = 3,850,300 ly)",
    "MUSIC ON SPOTIFY (NOT ALL MUSIC IS UPLOADED TO SERVICES!) <a href=\"https://open.spotify.com/artist/4aHO2KjIUwrRIJ0PdKu42Z\">ACCESS</a>",
    1
);
spotifynode.draw();

const applemusicnode = new StarNode(
    musicnode,
    0.2,
    "APPLE MUSIC",
    "PLANET",
    "(l = 265.1°, b = +40.2/°, d = 3,850,300 ly)",
    "MUSIC ON APPLE MUSIC (NOT ALL MUSIC IS UPLOADED TO SERVICES!) <a href=\"https://music.apple.com/us/artist/lilaf/1688449820\">ACCESS</a>",
    1
);
applemusicnode.draw();

const youtubenode = new StarNode(
    musicnode,
    0.2,
    "YOUTUBE",
    "PLANET",
    "(l = 265.1°, b = +40.2/°, d = 3,850,300 ly)",
    "MUSIC ON YOUTUBE (NOT ALL MUSIC IS UPLOADED TO SERVICES!) <a href=\"https://www.youtube.com/@LilafMusic\">ACCESS</a>",
    1
);
youtubenode.draw();

const socialnode = new StarNode(
    rootnode,
    0.3,
    "SOCIAL MEDIA AND CONTACT",
    "STAR",
    "(l = 236.2°, b = +40.3°, d = 3,850,300 ly)",
    "CONTACT LILAF ON VARIOUS PLATFORMS OR VIEW HIS CONTENT AND POSTS",
    1
);
socialnode.draw();

const discordnode = new StarNode(
    socialnode,
    0.2,
    "DISCORD",
    "PLANET",
    "(l = 265.1°, b = +40.2/°, d = 3,850,300 ly)",
    "DISCORD PROFILE: @lilafiann <a href=\"https://discord.com/channels/@me\">ACCESS</a>",
    1
);
discordnode.draw();

const youtube2node = new StarNode(
    socialnode,
    0.2,
    "YOUTUBE",
    "PLANET",
    "(l = 265.1°, b = +40.2/°, d = 3,850,300 ly)",
    "YOUTUBE PROFILE: @lilafian <a href=\"https://www.youtube.com/@lilafian\">ACCESS</a>",
    1
);
youtube2node.draw();

const githubnode = new StarNode(
    socialnode,
    0.2,
    "GITHUB",
    "PLANET",
    "(l = 265.1°, b = +40.2/°, d = 3,850,300 ly)",
    "GITHUB PROFILE: @lilafian <a href=\"https://www.github.com/Lilafian\">ACCESS</a>",
    1
);
githubnode.draw();

const emailnode = new StarNode(
    socialnode,
    0.2,
    "EMAIL",
    "PLANET",
    "(l = 265.1°, b = +40.2/°, d = 3,850,300 ly)",
    "EMAIL ADDRESS: lilafian74@proton.me <a href=\"mailto:lilafian74@proton.me\">ACCESS</a>",
    1
);
emailnode.draw();

const ambientLight = new THREE.AmbientLight(0xffffff, 100);
scene.add(ambientLight);

let theta = 0;
let phi = Math.PI / 2;
const radius = 5;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let targetTheta = 0;
let targetPhi = Math.PI / 2;
const autoRotationSpeed = 0.0004;
const smoothFactor = 0.05;
let targetZoom = 0;

let targetPosition = new THREE.Vector3();
let currentLookAtPosition = new THREE.Vector3();
let isTransitioning = false;

let selectedNode = rootnode.object;

function updateCameraPosition() {
    let newPosition = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
    
    if (isTransitioning) {
        camera.position.lerp(newPosition, smoothFactor);
        currentLookAtPosition.lerp(targetPosition, smoothFactor);
        
        if (camera.position.distanceTo(newPosition) < 0.01 &&
            currentLookAtPosition.distanceTo(targetPosition) < 0.01) {
            isTransitioning = false;
        }
    } else {
        camera.position.copy(newPosition);
        currentLookAtPosition.copy(targetPosition);
    }
    
    camera.lookAt(currentLookAtPosition);
}

function setSelectedNode(newNode) {
    selectedNode = newNode.object;
    targetPosition.copy(selectedNode.position);
    isTransitioning = true;
}

function animate() {
    if (!isDragging) {
        targetTheta += autoRotationSpeed;
    }

    theta += (targetTheta - theta) * smoothFactor;
    phi += (targetPhi - phi) * smoothFactor;

    updateCameraPosition();

    camera.translateZ(targetZoom * smoothFactor);
    targetZoom *= 0.99;

    rootnode.animateFrame();
    projectsnode.animateFrame();
    strawberrymilknode.animateFrame();
    musicnode.animateFrame();
    lavanode.animateFrame();
    xenosnode.animateFrame();
    harmonicshiftnode.animateFrame();
    spotifynode.animateFrame();
    applemusicnode.animateFrame();
    youtubenode.animateFrame();

    renderer.render(scene, camera);
}

function onMouseDown(event) {
    if (event.button === 1) {
        isDragging = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };
    }
}

function onMouseMove(event) {
    if (!isDragging) return;
    const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
    };
    targetTheta -= deltaMove.x * 0.01;
    targetPhi += deltaMove.y * 0.01;
    targetPhi = Math.min(Math.max(0.1, targetPhi), Math.PI - 0.1);
    previousMousePosition = { x: event.clientX, y: event.clientY };
}

function onMouseUp() {
    isDragging = false;
}

function onMouseWheel(event) {
    event.preventDefault();
    targetZoom += event.deltaY * 0.05;
    targetZoom = Math.max(-4, Math.min(100, targetZoom)); // Increased range
}

function handleObjectClick(clickedObject) {
    let node = clickedObject.userData.starNode;
    let objectTitle = document.getElementById('objecttitle');
    let objectType = document.getElementById('objecttype');
    let objectCoordinates = document.getElementById('objectcoordinates');
    let objectDescription = document.getElementById('objectdescription');

    objectTitle.innerHTML = node.name;
    objectType.innerHTML = node.type;
    objectCoordinates.innerHTML = node.coordinates;
    objectDescription.innerHTML = node.description;

    setSelectedNode(node);

    document.title = `STARNAV: ${node.name} [${node.type} AT ${node.coordinates}]`;
}

window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('wheel', onMouseWheel, false);

window.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            if (clickedObject.geometry.boundingSphere) {
                const boundingSphere = clickedObject.geometry.boundingSphere.clone();
                boundingSphere.applyMatrix4(clickedObject.matrixWorld);
                if (boundingSphere.containsPoint(intersects[0].point)) {
                    handleObjectClick(clickedObject);
                }
            }
        }
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

handleObjectClick(rootnode.object);