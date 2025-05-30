import { FreeCamera, Vector3, Scene, MeshBuilder, Mesh, Quaternion } from "@babylonjs/core";
import { AdvancedDynamicTexture, Rectangle, Control, TextBlock, StackPanel, Button, Grid } from "@babylonjs/gui";
import { Player } from "../entities/player/player";
import { HealingItem } from "../entities/player/itemTypes/healingItem";

export class PlayerView {
    private player: Player;
    private scene: Scene;

    private healthBarBackground: Rectangle;
    private healthBarForeground: Rectangle;

    public camera: FreeCamera;
    private hud: AdvancedDynamicTexture;
    private healthBar: Rectangle;
    private healthText: TextBlock;
    private weapons: string[] = ["pistol", "sniper", "shotgun", "auto"];
    private currentWeaponIndex: number = 0;
    private weaponBoxes: Rectangle[] = [];

    private static readonly CAMERA_HEIGHT = 1.6; // Adjust for FPS eye level

    private _onMouseMove: (event: MouseEvent) => void;

    private minimapUI?: AdvancedDynamicTexture;
    private minimapContainer?: Rectangle;
    private roomRects?: Rectangle[][];
    private minimapLevel?: any; // Level type
    private minimapPlayer?: Player;

    private enemyLeftContainer: Rectangle;
    private enemyLeftText: TextBlock;
    private enemyLeftSubText: TextBlock;

    private inventoryUI: AdvancedDynamicTexture | null = null;
    private inventoryVisible: boolean = false;
    private selectedInventoryIndex: number = 0;
    private inventorySlots: Rectangle[] = [];

    constructor(player: Player, scene: Scene) {
        this.player = player;
        this.scene = scene;
    }

    public _setupHUD(): void {
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);

        // --- ENEMY LEFT HUD ---
        this.enemyLeftContainer = new Rectangle();
        this.enemyLeftContainer.width = "320px";
        this.enemyLeftContainer.height = "70px";
        this.enemyLeftContainer.thickness = 0;
        this.enemyLeftContainer.background = "transparent";
        this.enemyLeftContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.enemyLeftContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.enemyLeftContainer.top = "10px";
        advancedTexture.addControl(this.enemyLeftContainer);

        const enemyStack = new StackPanel();
        enemyStack.isVertical = true;
        this.enemyLeftContainer.addControl(enemyStack);

        this.enemyLeftText = new TextBlock();
        this.enemyLeftText.fontSize = 32;
        this.enemyLeftText.color = "red";
        this.enemyLeftText.text = "ENEMY LEFT: ?";
        this.enemyLeftText.height = "40px";
        enemyStack.addControl(this.enemyLeftText);

        this.enemyLeftSubText = new TextBlock();
        this.enemyLeftSubText.fontSize = 18;
        this.enemyLeftSubText.color = "red";
        this.enemyLeftSubText.text = "Doors are locked!";
        this.enemyLeftSubText.height = "24px";
        enemyStack.addControl(this.enemyLeftSubText);

        // Conteneur principal
        const healthContainer = new Rectangle();
        healthContainer.width = "220px";
        healthContainer.height = "60px";
        healthContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        healthContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        healthContainer.paddingTop = "10px";
        healthContainer.paddingLeft = "10px";
        advancedTexture.addControl(healthContainer);

        const stackPanel = new StackPanel();
        stackPanel.isVertical = true;
        healthContainer.addControl(stackPanel);

        // Fond de la barre de vie
        this.healthBarBackground = new Rectangle();
        this.healthBarBackground.width = "200px";
        this.healthBarBackground.height = "20px";
        this.healthBarBackground.color = "white";
        this.healthBarBackground.background = "gray";
        this.healthBarBackground.thickness = 1;
        this.healthBarBackground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        stackPanel.addControl(this.healthBarBackground);

        // Barre de vie rouge (au-dessus du fond)
        this.healthBarForeground = new Rectangle();
        this.healthBarForeground.width = "100%";
        this.healthBarForeground.height = "100%";
        this.healthBarForeground.background = "red";
        this.healthBarForeground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.healthBarForeground.thickness = 0;
        this.healthBarBackground.addControl(this.healthBarForeground);

        // Minimap
        this.createMinimap(this.player.controller._level, this.player);

        // Mise à jour dynamique
        this.scene.registerBeforeRender(() => {
            const percentage = Math.max(0, this.player.health) / 100;
            this.healthBarForeground.width = `${percentage * 100}%`;
        });

        // --- Dynamic update for ENEMY LEFT HUD ---
        this.scene.registerBeforeRender(() => {
            // Get the current room and enemy count
            const currentRoom = this.player.controller.currentRoom;
            let enemiesLeft = 0;
            if (currentRoom && this.player.controller._level.enemyManager) {
                enemiesLeft = this.player.controller._level.enemyManager.countEnemies();
            }
            if (enemiesLeft > 0) {
                this.enemyLeftText.text = `ENEMY LEFT: ${enemiesLeft}`;
                this.enemyLeftText.color = "red";
                this.enemyLeftSubText.text = "Doors are locked!";
                this.enemyLeftSubText.color = "red";
            } else {
                this.enemyLeftText.text = "ENEMY LEFT: 0";
                this.enemyLeftText.color = "#2196f3"; // blue
                this.enemyLeftSubText.text = "Doors are unlocked!";
                this.enemyLeftSubText.color = "#2196f3";
            }
        });

        // Inventory button (bottom left)
        const inventoryBtn = Button.CreateSimpleButton("inventoryBtn", "Inventory (Tab)");
        inventoryBtn.width = "160px";
        inventoryBtn.height = "40px";
        inventoryBtn.color = "white";
        inventoryBtn.background = "#444";
        inventoryBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        inventoryBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        inventoryBtn.top = "-130px";
        inventoryBtn.left = "20px";
        inventoryBtn.onPointerUpObservable.add(() => this.toggleInventory());
        advancedTexture.addControl(inventoryBtn);

        // Listen for Tab key
        window.addEventListener("keydown", (e) => {
            if (e.code === "Tab") {
                e.preventDefault();
                this.toggleInventory();
            }
        });

        this.setupWeaponSystem(this.scene, advancedTexture);

        window.addEventListener("keydown", (e) => {
            const validKeys = ["Digit1", "Digit2", "Digit3", "Digit4","Numpad1", "Numpad2", "Numpad3", "Numpad4"];
            if (validKeys.includes(e.code)) {
                e.preventDefault();
                this.currentWeaponIndex = parseInt(e.code.replace('Digit','').replace('Numpad','')) - 1;
                this.updateWeaponUI();
                this.player.switchWeapon(this.weapons[this.currentWeaponIndex]);
            }
        });

    }

    private setupWeaponSystem(scene, advancedTexture: AdvancedDynamicTexture): void {
        const weapons =  ["pistol", "sniper", "shotgun", "auto"];

        const weaponUIContainer = new StackPanel();
        weaponUIContainer.width = "400px";
        weaponUIContainer.height = "100px";
        weaponUIContainer.isVertical = false;
        weaponUIContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        weaponUIContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        weaponUIContainer.paddingBottom = "20px";
        weaponUIContainer.paddingLeft = "20px";
        advancedTexture.addControl(weaponUIContainer);

        weapons.forEach((weaponName, index) => {
            const box = new Rectangle();
            box.width = "80px";
            box.height = "80px";
            box.color = "#ffffff";
            box.thickness = 4;
            box.background = "#222";
            box.cornerRadius = 20;

            const label = new TextBlock();
            label.text = `${index + 1}: ${weaponName}`;
            label.color = "white";
            label.fontSize = 16;

            box.addControl(label);
            weaponUIContainer.addControl(box);
            this.weaponBoxes.push(box);

            if (index < weapons.length - 1) {
                const spacer = new Rectangle();
                spacer.width = "5px";
                spacer.height = "1px";
                spacer.thickness = 0;
                spacer.background = "transparent";
                weaponUIContainer.addControl(spacer);
            }
        });
        this.updateWeaponUI();
    }


    private updateWeaponUI(): void {
        console.log(`Switching to weapon: ${this.weapons[this.currentWeaponIndex]}`);
        this.weaponBoxes.forEach((box, index) => {
            box.color = (index === this.currentWeaponIndex) ? "#00ff00" : "white";
        });
    }

    private toggleInventory(): void {
        if (this.inventoryVisible) {
            this.closeInventory();
        } else {
            this.openInventory();
        }
    }

    private openInventory(): void {
        if (this.inventoryUI) return;
        this.inventoryUI = AdvancedDynamicTexture.CreateFullscreenUI("InventoryUI", true, this.scene);
        this.inventoryVisible = true;
        this.selectedInventoryIndex = 0;
        this.inventorySlots = [];

        const bg = new Rectangle();
        bg.width = "500px";
        bg.height = "400px";
        bg.thickness = 2;
        bg.background = "rgba(30,30,30,0.95)";
        bg.cornerRadius = 20;
        bg.color = "white";
        bg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        this.inventoryUI.addControl(bg);

        const title = new TextBlock();
        title.text = "Inventory";
        title.fontSize = 32;
        title.color = "white";
        title.height = "60px";
        title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        bg.addControl(title);

        // --- Guide text ---
        const guideText = new TextBlock();
        guideText.text = "Arrow keys to navigate, Enter to use";
        guideText.fontSize = 18;
        guideText.color = "#bbb";
        guideText.height = "30px";
        guideText.width = "300px";
        guideText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        guideText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        guideText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        guideText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        guideText.top = "-20px";
        bg.addControl(guideText);

        // Inventory grid (2 rows x 3 cols = 6 slots)
        const grid = new Grid();
        grid.width = "90%";
        grid.height = "70%";
        grid.addColumnDefinition(1 / 3);
        grid.addColumnDefinition(1 / 3);
        grid.addColumnDefinition(1 / 3);
        grid.addRowDefinition(1 / 2);
        grid.addRowDefinition(1 / 2);
        grid.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        grid.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        bg.addControl(grid);

        const items = this.player.inventory.getItems();
        for (let i = 0; i < 6; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const slot = new Rectangle();
            slot.width = "120px";
            slot.height = "80px";
            slot.thickness = 1;
            slot.color = "#888";
            slot.background = "#222";
            slot.cornerRadius = 10;
            slot.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
            slot.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;

            if (items[i]) {
                const item = items[i];
                const itemText = new TextBlock();
                itemText.text = item.name;
                itemText.color = "white";
                itemText.fontSize = 20;
                slot.addControl(itemText);

                let lastClick = 0;
                slot.onPointerUpObservable.add(() => {
                    const now = Date.now();
                    if (now - lastClick < 400) {
                        if (item.use && item.use(this.player)) {
                            this.player.inventory.removeItem(item.name);
                            this.closeInventory();
                        }
                    }
                    lastClick = now;
                });
            }

            grid.addControl(slot, row, col);
            this.inventorySlots.push(slot);
        }

        // Highlight the selected slot
        const updateHighlight = () => {
            for (let i = 0; i < this.inventorySlots.length; i++) {
                this.inventorySlots[i].thickness = (i === this.selectedInventoryIndex) ? 4 : 1;
                this.inventorySlots[i].color = (i === this.selectedInventoryIndex) ? "#2196f3" : "#888";
            }
        };
        updateHighlight();

        // Keyboard navigation
        const onKeyDown = (e: KeyboardEvent) => {
            if (!this.inventoryVisible) return;
            let row = Math.floor(this.selectedInventoryIndex / 3);
            let col = this.selectedInventoryIndex % 3;
            if (e.code === "ArrowRight") {
                col = (col + 1) % 3;
            } else if (e.code === "ArrowLeft") {
                col = (col + 2) % 3;
            } else if (e.code === "ArrowDown") {
                row = (row + 1) % 2;
            } else if (e.code === "ArrowUp") {
                row = (row + 1) % 2;
            } else if (e.code === "Enter") {
                const itemsArr = Object.values(this.player.inventory.getItems());
                const item = itemsArr[this.selectedInventoryIndex];
                if (item && item.use && item.use(this.player)) {
                    this.player.inventory.removeItem(item.name);
                    this.closeInventory();
                }
            } else if (e.code === "Tab" || e.code === "Escape") {
                e.preventDefault();
                this.closeInventory();
                return;
            } else {
                return;
            }
            this.selectedInventoryIndex = row * 3 + col;
            updateHighlight();
            e.preventDefault();
        };
        window.addEventListener("keydown", onKeyDown);

        // Remove listener on close
        this.inventoryUI.onDisposeObservable.add(() => {
            window.removeEventListener("keydown", onKeyDown);
        });
    }

    private closeInventory(): void {
        if (this.inventoryUI) {
            this.inventoryUI.dispose();
            this.inventoryUI = null;
        }
        this.inventoryVisible = false;
    }

    public _setupCamera(): void {
        const canvas = this.scene.getEngine().getRenderingCanvas();

        canvas.addEventListener("click", () => {
            canvas.requestPointerLock();
            if (canvas.requestFullscreen) {
                canvas.requestFullscreen();
            }
        });

        // Create a FreeCamera for FPS controls
        this.camera = new FreeCamera("FpsCamera", new Vector3(0, PlayerView.CAMERA_HEIGHT, 0), this.scene);
        // Disable built-in inputs
        this.camera.inputs.clear();

        this.camera.inertia = 0;
        this.camera.angularSensibility = 500; // Adjust to taste
        this.scene.activeCamera = this.camera;

        // Set up our custom mouse movement handler
        this._onMouseMove = (event: MouseEvent) => {
            if (document.pointerLockElement === canvas) {
                const sensitivity = 0.002;
                // Update yaw and pitch regardless of mouse button state
                this.camera.rotation.y += event.movementX * sensitivity;
                this.camera.rotation.x += event.movementY * sensitivity;
                // Clamp pitch between -90° and +90° (in radians)
                const limit = Math.PI / 2 - 0.1;
                this.camera.rotation.x = Math.max(-limit, Math.min(limit, this.camera.rotation.x));
            }
        };
        canvas.addEventListener("mousemove", this._onMouseMove);
    }

    public updateCamera(): void {
        if (!this.camera || !this.player._body || !this.scene) return;
        // Position the camera at the player's head.
        const playerPos = this.player._body.transformNode.position.clone();
        playerPos.y += PlayerView.CAMERA_HEIGHT;
        this.camera.position.copyFrom(playerPos);

        // Update the player visual (if any) to follow the camera’s yaw:
        if (this.player.controller.assets?.mesh) {
            // Only update the Y rotation from the camera so the player faces the same way
            const yaw = this.camera.rotation.y;
            this.player.controller.assets.mesh.rotationQuaternion = Quaternion.FromEulerAngles(0, yaw, 0);
        }
    }

    public createMinimap(level: any, player: Player): void {
        this.minimapLevel = level;
        this.minimapPlayer = player;
        this.minimapUI = AdvancedDynamicTexture.CreateFullscreenUI("MinimapUI", true, this.scene);
        this.minimapContainer = new Rectangle("minimapContainer");
        this.minimapContainer.width = "180px";
        this.minimapContainer.height = "180px";
        this.minimapContainer.thickness = 2;
        this.minimapContainer.background = "rgba(0,0,0,0.5)";
        this.minimapContainer.cornerRadius = 10;
        this.minimapContainer.color = "white";
        this.minimapContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        this.minimapContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        this.minimapContainer.top = "20px";
        this.minimapContainer.left = "-20px";
        this.minimapUI.addControl(this.minimapContainer);

        const roomsGrid = level.getRooms();
        const gridRows = roomsGrid.length;
        const gridCols = roomsGrid[0].length;
        this.roomRects = [];

        for (let y = 0; y < gridRows; y++) {
            this.roomRects[y] = [];
            for (let x = 0; x < gridCols; x++) {
                const room = roomsGrid[y][x];
                if (!room) continue;

                const roomRect = new Rectangle();
                roomRect.width = "18px";
                roomRect.height = "18px";
                roomRect.thickness = 1;
                roomRect.background = "#bbb";
                roomRect.color = "#333";
                roomRect.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
                roomRect.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
                // Flip vertically: draw row 0 at the bottom, last row at the top
                roomRect.left = `${10 + x * 20}px`;
                roomRect.top = `${10 + (gridRows - 1 - y) * 20}px`;
                this.minimapContainer.addControl(roomRect);
                this.roomRects[y][x] = roomRect;
            }
        }
        // Initial update
        this.updateMinimap();
    }

    public updateMinimap(): void {
        if (!this.roomRects || !this.minimapLevel || !this.minimapPlayer) return;
        const roomsGrid = this.minimapLevel.getRooms();
        const gridRows = roomsGrid.length;
        const gridCols = roomsGrid[0].length;
        let currentRoom = this.minimapPlayer.controller?.currentRoom;
        for (let y = 0; y < gridRows; y++) {
            for (let x = 0; x < gridCols; x++) {
                const rect = this.roomRects[y][x];
                if (!rect) continue;
                const room = roomsGrid[y][x];
                if (!room) continue;

                if (room === currentRoom) {
                    // Current room: yellow/orange border
                    rect.background = "#ff0";
                    rect.thickness = 3;
                    rect.color = "#f80";
                } else if (room.isCompleted()) {
                    // Cleared room: blue
                    rect.background = "#2196f3";
                    rect.thickness = 2;
                    rect.color = "#1976d2";
                } else {
                    // Unvisited/uncleared room: gray
                    rect.background = "#bbb";
                    rect.thickness = 1;
                    rect.color = "#333";
                }
            }
        }
    }
    public showNotification(message: string, color: string = "red", duration: number = 5000): void {
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("NotificationUI", true, this.scene);

        const notif = new TextBlock();
        notif.text = message;
        notif.color = color;
        notif.fontSize = 24;
        notif.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        notif.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        notif.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        notif.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        notif.paddingRight = "30px";
        notif.paddingBottom = "30px";
        notif.outlineColor = "#000";
        notif.outlineWidth = 4;
        advancedTexture.addControl(notif);

        setTimeout(() => {
            advancedTexture.dispose();
        }, duration);
    }
}
