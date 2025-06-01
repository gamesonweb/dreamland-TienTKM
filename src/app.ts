import HavokPhysics from "@babylonjs/havok";
import { Environment } from "./environment";
import { HavokPlugin } from "@babylonjs/core/Physics";
import { Scene } from "@babylonjs/core/scene";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color4, Vector3 } from "@babylonjs/core/Maths";
import { Engine } from "@babylonjs/core/Engines";
import { InputController } from "./controller/inputController";
import { Player } from "./entities/player/player";
import { EnemyManager } from "./entities/enemy/enemyManager";
import { AdvancedDynamicTexture, Button, Control, Rectangle, TextBlock } from "@babylonjs/gui";
import { Level } from "./level";
// Constants
let unknownTextAudio: HTMLAudioElement | null = null;
let reverieAudio: HTMLAudioElement | null = null;
let adventureAudio: HTMLAudioElement | null = null;
let winAudio: HTMLAudioElement | null = null; // Add this at the top with other audio variables

const CANVAS_ID = "gameCanvas";
const CAMERA_RADIUS = 10;
const CAMERA_START_RADIUS_LIMIT = 5;
const CAMERA_LOSE_RADIUS_LIMIT = 2;
const CAMERA_CUTSCENE_UPPER_RADIUS_LIMIT = 15;

const LIGHT_INTENSITY_START = 0.8;
const LIGHT_INTENSITY_LOSE = 0.5;
const LIGHT_INTENSITY_CUTSCENE = 0.7;

const ROOM_SIZE = new Vector3(40, 3, 40);
const ROOM_SIZE_2 = new Vector3(50, 3, 100);
const ENEMY_COUNT_ROOM1 = 2;

const BUTTON_WIDTH = 0.2;
const BUTTON_HEIGHT = "40px";
const BUTTON_COLOR = "white";

const SCENE_COLOR_START = new Color4(0, 0, 0, 1);
const SCENE_COLOR_GAME = new Color4(0.015, 0.015, 0.203);
const SCENE_COLOR_LOSE = new Color4(0.5, 0, 0, 1);

const PHYSICS_GRAVITY = new Vector3(0, -9.81, 0);

enum State {
    START = 0,
    GAME = 1,
    LOSE = 2,
    CUTSCENE = 3,
    WIN = 4 // Add WIN state
}

// App Class
export class App {
    private readonly _canvas: HTMLCanvasElement;
    private readonly _engine: Engine;
    private _scene: Scene;
    private _state: State = State.START;
    private _winOverlay: AdvancedDynamicTexture | null = null;
    private _gameStartTime: number = 0;

    constructor() {
        this._canvas = this._createCanvas();
        this._engine = new Engine(this._canvas, true);
        this._main();
    }

    private _createCanvas(): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        canvas.id = CANVAS_ID;
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.style.margin = "0";
        document.body.style.overflow = "hidden";
        document.body.appendChild(canvas);
        return canvas;
    }

    private async _main(): Promise<void> {
        this._scene = new Scene(this._engine);
        await this._goToStart();

        this._engine.runRenderLoop(() => {
            switch (this._state) {
                case State.START:
                case State.CUTSCENE:
                case State.GAME:
                case State.LOSE:
                    this._scene.render();
                    break;
            }
        });

        window.addEventListener("resize", () => {
            this._canvas.width = window.innerWidth;
            this._canvas.height = window.innerHeight;
            this._engine.resize();
        });
    }

    private _addCameraAndLight(scene: Scene, cameraName: string): { camera: ArcRotateCamera; light: HemisphericLight } {
        const camera = new ArcRotateCamera(cameraName, Math.PI / 2, Math.PI / 2, CAMERA_RADIUS, Vector3.Zero(), scene);
        camera.attachControl(this._canvas, true);

        const light = new HemisphericLight(`${cameraName}Light`, new Vector3(0, 1, 0), scene);

        return { camera, light };
    }

    private async _goToStart(): Promise<void> {
        // clear previous scene if exists
        this._scene?.dispose();
        // Create a new scene
        const scene = new Scene(this._engine);
        scene.clearColor = SCENE_COLOR_START;

        const { camera, light } = this._addCameraAndLight(scene, "StartCamera");
        camera.lowerRadiusLimit = CAMERA_START_RADIUS_LIMIT;
        light.intensity = LIGHT_INTENSITY_START;

        // Create fullscreen UI
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("StartUI");

        // Create a popup rectangle for the start menu
        const popup = new Rectangle("startPopup");
        popup.width = "450px";
        popup.height = "250px";
        popup.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        popup.background = "rgba(30, 30, 30, 0.95)";
        popup.cornerRadius = 20;
        popup.thickness = 2;
        popup.color = "white";
        guiMenu.addControl(popup);

        // Title text
        const titleText = new TextBlock();
        titleText.text = "Yumemi's Memories";
        titleText.color = "white";
        titleText.fontSize = 48;
        titleText.height = "80px";
        titleText.top = "30px";
        titleText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        titleText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(titleText);

        // Start button
        const startButton = Button.CreateSimpleButton("start", "START GAME");
        startButton.width = "180px";
        startButton.height = "50px";
        startButton.color = "white";
        startButton.background = "#222";
        startButton.cornerRadius = 10;
        startButton.fontSize = 24;
        startButton.top = "80px";
        startButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        startButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(startButton);

        startButton.onPointerUpObservable.add(() => {
            guiMenu.dispose();
            this._goToCutScene();
        });

        this._scene = scene;
        this._state = State.START;
    }

    private _cutsceneDialogue = [
        { speaker: "player", text: "Where am I...?" },
        { speaker: "other", text: "Welcome, Yumemi." },
        { speaker: "player", text: "Who are you?" },
        { speaker: "other", text: "That doesn't matter right now. You must remember." },
        { speaker: "player", text: "Remember what?" },
        { speaker: "other", text: "Your memories are scattered. Find them." },
        { speaker: "player", text: "This isn't real, this is just a dream..." },
        { speaker: "player", text: "I need to wake up!" },
        { speaker: "other", text: "I see... You are still not ready, then be careful, monsters are about." },
        { speaker: "player", text: "M-monsters? What am I going to do...?" },
        { speaker: "other", text: "You must fight them! This is your dream, your imagination is the greatest weapon." },

    ];
    private _cutsceneIndex = 0;
    private _cutsceneTypingTimeout: number | null = null;

    private async _goToCutScene(): Promise<void> {
        // Play Reverie.ogg on loop until the game starts
        if (!reverieAudio) {
            reverieAudio = new Audio("./sounds/Reverie.ogg");
            reverieAudio.loop = true;
            reverieAudio.volume = 0.7; // Optional: set volume
            reverieAudio.play().catch(() => { /* ignore rapidplay errors */ });
        }
        this._scene?.dispose();
        const scene = new Scene(this._engine);
        scene.clearColor = SCENE_COLOR_START;

        const { camera, light } = this._addCameraAndLight(scene, "CutSceneCamera");
        camera.upperRadiusLimit = CAMERA_CUTSCENE_UPPER_RADIUS_LIMIT;
        light.intensity = LIGHT_INTENSITY_CUTSCENE;

        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("CutsceneUI");

        // Dialogue box
        const dialogueBox = new Rectangle("dialogueBox");
        dialogueBox.width = "700px";
        dialogueBox.height = "160px";
        dialogueBox.cornerRadius = 20;
        dialogueBox.thickness = 4;
        dialogueBox.background = "rgba(30,30,30,0.95)";
        dialogueBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        dialogueBox.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        dialogueBox.top = "-40px";
        guiMenu.addControl(dialogueBox);

        // Dialogue text
        const dialogueText = new TextBlock();
        dialogueText.text = "";
        dialogueText.color = "white";
        dialogueText.fontSize = 28;
        dialogueText.textWrapping = true;
        dialogueText.paddingLeft = "30px";
        dialogueText.paddingRight = "30px";
        dialogueText.paddingTop = "30px";
        dialogueText.paddingBottom = "30px";
        dialogueBox.addControl(dialogueText);

        // Speaker name (optional)
        const speakerText = new TextBlock();
        speakerText.text = "";
        speakerText.fontSize = 20;
        speakerText.height = "30px";
        speakerText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        speakerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        speakerText.paddingLeft = "20px";
        dialogueBox.addControl(speakerText);

        // Tip text (top right)
        const tipText = new TextBlock();
        tipText.text = "Click to continue...";
        tipText.fontSize = 18;
        tipText.color = "#bbb";
        tipText.height = "40px";
        tipText.width = "200px";
        tipText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        tipText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        tipText.top = "10px";
        tipText.left = "-20px";
        tipText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        tipText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        guiMenu.addControl(tipText);

        // Helper to update dialogue
        const updateDialogue = () => {
            const line = this._cutsceneDialogue[this._cutsceneIndex];
            if (!line) {
                // Stop sound if playing
                if (unknownTextAudio) {
                    unknownTextAudio.pause();
                    unknownTextAudio.currentTime = 0;
                }
                guiMenu.dispose();
                this._goToGame();
                return;
            }

            // Typing effect
            if (this._cutsceneTypingTimeout) {
                clearTimeout(this._cutsceneTypingTimeout);
                this._cutsceneTypingTimeout = null;
            }
            let currentLength = 0;
            dialogueText.text = "";
            const fullText = line.text;
            const typingSpeed = 18; // ms per character, adjust for speed

            // Play sound if ??? is speaking
            if (line.speaker === "other") {
                if (!unknownTextAudio) {
                    unknownTextAudio = new Audio("./sounds/unknownText.mp3");
                    unknownTextAudio.loop = true;
                }
                unknownTextAudio.currentTime = 0;
                unknownTextAudio.play();
            } else {
                if (unknownTextAudio) {
                    unknownTextAudio.pause();
                    unknownTextAudio.currentTime = 0;
                }
            }

            const typeNext = () => {
                if (currentLength <= fullText.length) {
                    dialogueText.text = fullText.slice(0, currentLength);
                    currentLength++;
                    this._cutsceneTypingTimeout = window.setTimeout(typeNext, typingSpeed);
                } else {
                    this._cutsceneTypingTimeout = null;
                    // Stop sound when typing is done
                    if (line.speaker === "other" && unknownTextAudio) {
                        unknownTextAudio.pause();
                        unknownTextAudio.currentTime = 0;
                    }
                }
            };
            typeNext();

            if (line.speaker === "player") {
                dialogueBox.color = "#2196f3";
                dialogueBox.thickness = 4;
                speakerText.text = "Yumemi";
                speakerText.color = "#2196f3";
            } else {
                dialogueBox.color = "#111";
                dialogueBox.thickness = 4;
                speakerText.text = "???";
                speakerText.color = "#fff";
            }
        };

        // Initial dialogue
        this._cutsceneIndex = 0;
        updateDialogue();

        // Advance on click/tap
        dialogueBox.onPointerUpObservable.add(() => {
            const line = this._cutsceneDialogue[this._cutsceneIndex];
            if (!line) return;
            if (this._cutsceneTypingTimeout) {
                // Finish typing immediately
                clearTimeout(this._cutsceneTypingTimeout);
                this._cutsceneTypingTimeout = null;
                dialogueText.text = line.text;
            } else {
                // Play unknownText sound on click to advance

                unknownTextAudio = new Audio("./sounds/unknownText.mp3");
                unknownTextAudio.volume = 0.7;

                unknownTextAudio.currentTime = 0;
                unknownTextAudio.play().catch(() => { });
                this._cutsceneIndex++;
                updateDialogue();
            }
        });

        this._scene = scene;
        this._state = State.CUTSCENE;
    }

    private async _goToGame(): Promise<void> {
        // Stop Reverie.ogg if playing
        if (reverieAudio) {
            reverieAudio.pause();
            reverieAudio.currentTime = 0;
        }
        // Play Adventure.ogg for the game
        if (!adventureAudio) {
            adventureAudio = new Audio("./sounds/Adventure.ogg");
            adventureAudio.loop = true;
            adventureAudio.volume = 0.2;
        }
        adventureAudio.currentTime = 0;
        adventureAudio.play().catch(() => { });

        // Dispose previous scene if exists
        this._scene?.dispose();
        // Create a new scene for the game
        const scene = new Scene(this._engine);
        scene.clearColor = SCENE_COLOR_GAME;

        const havokInterface = await HavokPhysics();
        const havokPlugin = new HavokPlugin(undefined, havokInterface);
        scene.enablePhysics(PHYSICS_GRAVITY, havokPlugin);

        this._addCameraAndLight(scene, "GameCamera");

        const level = new Level(scene);
        console.log("Début chargement niveau")
        // const rooms = level.generateSimpleRandomLevel(4, 4, ROOM_SIZE);
        const rooms = level.generateStage(8, 4, 4);
        console.log("Fin chargement");


        const inputController = new InputController(scene);
        const player = new Player("player", scene, rooms[2][2], level);
        level.playerEnterRoom(rooms[2][2]);

        const enemyManager = new EnemyManager(scene, player);
        level.setEnemyManager(enemyManager);

        // Show instructions using PlayerView
        player.view.showNotification(
            "Instructions: WASD or ZQSD to move, Space to jump, Left Click to shoot, Number Keys to switch weapons, Tab to open Inventory.",
            "#2196f3",
            8000 // Show for 8 seconds
        );
        player.view.showNotification(
            "Weapons other than basic uses mana.",
            "#2196f3",
            8000 // Show for 8 seconds
        );
        player.view.showNotification(
            "You can not aim while shooting. Clear all rooms to win.",
            "#2196f3",
            8000 // Show for 8 seconds
        );

        // Track game start time
        this._gameStartTime = Date.now();

        // Add a lose game button
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const loseButton = Button.CreateSimpleButton("lose", "LOSE GAME");
        loseButton.width = BUTTON_WIDTH;
        loseButton.height = BUTTON_HEIGHT;
        loseButton.color = BUTTON_COLOR;
        loseButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        // guiMenu.addControl(loseButton);

        player.onDeath = () => {
            this._goToLose();
        };

        loseButton.onPointerUpObservable.add(() => {
            this._goToLose();
        });

        // WIN CHECK: If all rooms are completed, go to win
        const checkWin = () => {
            // Flatten all rooms and check if all are completed
            const allRooms = rooms.flat();
            if (allRooms.every(room => room.isCompleted())) {
                this._goToWin();
            }
        };

        this._engine.runRenderLoop(() => {

            scene.render();
            if (this._state === State.GAME) {
                player.update();
                enemyManager.updateEnemies();
            }
            if (this._state !== State.WIN) {
                checkWin();
            }


        });

        this._scene = scene;
        this._state = State.GAME;
    }

    // WIN OVERLAY
    private async _goToWin(): Promise<void> {
        // Remove previous overlay if it exists
        if (this._winOverlay) {
            this._winOverlay.dispose();
        }

        // Play win.ogg audio
        if (!winAudio) {
            winAudio = new Audio("./sounds/win.ogg");
            winAudio.volume = 0.7;
        }
        winAudio.currentTime = 0;
        winAudio.play().catch(() => { });

        this._winOverlay = AdvancedDynamicTexture.CreateFullscreenUI("WinUI");

        // Create a popup rectangle
        const popup = new Rectangle("popup");
        popup.width = "800px";
        popup.height = "500px";
        popup.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        popup.background = "rgba(30, 30, 30, 0.95)";
        popup.cornerRadius = 20;
        popup.thickness = 2;
        popup.color = "white";
        this._winOverlay.addControl(popup);

        // Congratulations text
        const winText = new TextBlock();
        winText.text = "CONGRATULATIONS!";
        winText.color = "#4caf50";
        winText.fontSize = 48;
        winText.height = "80px";
        winText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        winText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(winText);

        // Huge YOU WIN! text
        const youWinText = new TextBlock();
        youWinText.text = "YOU WIN!";
        youWinText.color = "#ffd700";
        youWinText.fontSize = 100;
        youWinText.height = "120px";
        youWinText.top = "70px";
        youWinText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        youWinText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(youWinText);

        // Completion time
        const completionTime = ((Date.now() - this._gameStartTime) / 1000);
        const minutes = Math.floor(completionTime / 60);
        const seconds = Math.floor(completionTime % 60);
        const timeText = new TextBlock();
        timeText.text = `Completion Time: ${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`;
        timeText.color = "white";
        timeText.fontSize = 28;
        timeText.height = "50px";
        timeText.top = "170px";
        timeText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        timeText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(timeText);

        // Story phrase
        const storyText = new TextBlock();
        storyText.text = "You woke up on your bed...\nBut something feels missing";
        storyText.color = "#fff";
        storyText.fontSize = 28;
        storyText.height = "80px";
        storyText.top = "230px";
        storyText.textWrapping = true;
        storyText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        storyText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(storyText);

        this._state = State.WIN;
    }

    private _loseOverlay: AdvancedDynamicTexture | null = null;

    private async _goToLose(): Promise<void> {
        // Remove previous overlay if it exists
        if (this._loseOverlay) {
            this._loseOverlay.dispose();
        }

        this._loseOverlay = AdvancedDynamicTexture.CreateFullscreenUI("LoseUI");

        // Create a popup rectangle
        const popup = new Rectangle("popup");
        popup.width = "800px";
        popup.height = "200px";
        popup.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        popup.background = "rgba(30, 30, 30, 0.95)";
        popup.cornerRadius = 20;
        popup.thickness = 2;
        popup.color = "white";
        this._loseOverlay.addControl(popup);

        // Game Over text
        const loseText = new TextBlock();
        loseText.text = "GAME OVER";
        loseText.color = "red";
        loseText.fontSize = 48;
        loseText.height = "80px";
        loseText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        loseText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(loseText);

        // Info text
        const infoText = new TextBlock();
        infoText.text = "Please refresh the browser to restart the game.";
        infoText.color = "white";
        infoText.fontSize = 24;
        infoText.height = "60px";
        infoText.top = "60px";
        infoText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        infoText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        popup.addControl(infoText);

        this._state = State.LOSE;
    }


}

let app = new App();