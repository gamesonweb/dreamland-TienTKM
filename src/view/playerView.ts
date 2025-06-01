import { FreeCamera, Vector3, Scene, MeshBuilder, Mesh, Quaternion } from "@babylonjs/core";
import { AdvancedDynamicTexture, Rectangle, Control, TextBlock, StackPanel, Button, Grid, Image } from "@babylonjs/gui";
import { Player } from "../entities/player/player";
import { HealingItem } from "../entities/player/itemTypes/healingItem";

export class PlayerView {
    private player: Player;
    private scene: Scene;

    private healthBarBackground: Rectangle;
    private healthBarForeground: Rectangle;
    private manaBarBackground: Rectangle;
    private manaBarForeground: Rectangle;

    public camera: FreeCamera;
    private hud: AdvancedDynamicTexture;
    private healthBar: Rectangle;
    private healthText: TextBlock;
    private weapons: string[] = ["basic", "focus", "burst", "rapid"];
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

    private lastHitEnemyName: string | null = null;
    private lastHitEnemyHP: number | null = null;
    private lastHitEnemyMaxHP: number | null = null;
    private lastHitEnemyBarBackground: Rectangle;
    private lastHitEnemyBarForeground: Rectangle;
    private lastHitEnemyLabel: TextBlock;

    private damageFlashRect: Rectangle | null = null;

    private static activeNotifications: TextBlock[] = [];
    private static NOTIFICATION_SPACING = 40; // px

    constructor(player: Player, scene: Scene) {
        this.player = player;
        this.scene = scene;
    }

    public _setupHUD(): void {
        const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);

        // --- ENEMY LEFT HUD ---
        this.enemyLeftContainer = new Rectangle();
        this.enemyLeftContainer.width = "320px";
        this.enemyLeftContainer.height = "100px";
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

        // Enemy last hit display
        this.lastHitEnemyLabel = new TextBlock();
        this.lastHitEnemyLabel.fontSize = 18;
        this.lastHitEnemyLabel.color = "#fff";
        this.lastHitEnemyLabel.text = "";
        this.lastHitEnemyLabel.height = "24px";
        enemyStack.addControl(this.lastHitEnemyLabel);

        // Enemy HP bar background
        this.lastHitEnemyBarBackground = new Rectangle();
        this.lastHitEnemyBarBackground.width = "200px";
        this.lastHitEnemyBarBackground.height = "16px";
        this.lastHitEnemyBarBackground.color = "white";
        this.lastHitEnemyBarBackground.background = "gray";
        this.lastHitEnemyBarBackground.thickness = 1;
        // Center the bar horizontally
        this.lastHitEnemyBarBackground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        enemyStack.addControl(this.lastHitEnemyBarBackground);

        // Enemy HP bar foreground
        this.lastHitEnemyBarForeground = new Rectangle();
        this.lastHitEnemyBarForeground.width = "100%";
        this.lastHitEnemyBarForeground.height = "100%";
        this.lastHitEnemyBarForeground.background = "red";
        // Center the foreground inside the background
        this.lastHitEnemyBarForeground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.lastHitEnemyBarForeground.thickness = 0;
        this.lastHitEnemyBarBackground.addControl(this.lastHitEnemyBarForeground);

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

        // Add mana bar below health bar
        this.manaBarBackground = new Rectangle();
        this.manaBarBackground.width = "200px";
        this.manaBarBackground.height = "14px";
        this.manaBarBackground.color = "white";
        this.manaBarBackground.background = "#224488";
        this.manaBarBackground.thickness = 1;
        this.manaBarBackground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.manaBarBackground.top = "4px";
        stackPanel.addControl(this.manaBarBackground);

        this.manaBarForeground = new Rectangle();
        this.manaBarForeground.width = "100%";
        this.manaBarForeground.height = "100%";
        this.manaBarForeground.background = "#2196f3";
        this.manaBarForeground.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.manaBarForeground.thickness = 0;
        this.manaBarBackground.addControl(this.manaBarForeground);

        // Minimap
        this.createMinimap(this.player.controller._level, this.player);

        // Mise à jour dynamique
        this.scene.registerBeforeRender(() => {
            const percentage = Math.max(0, this.player.health) / 100;
            this.healthBarForeground.width = `${percentage * 100}%`;
        });

        this.scene.registerBeforeRender(() => {
            const percentage = Math.max(0, this.player.mana) / this.player.maxMana;
            this.manaBarForeground.width = `${percentage * 100}%`;
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

        // Add a dynamic update for the last hit enemy display
        this.scene.registerBeforeRender(() => {
            if (this.lastHitEnemyName && this.lastHitEnemyHP !== null && this.lastHitEnemyMaxHP !== null) {
                this.lastHitEnemyLabel.text = `${this.lastHitEnemyName}`;
                const percentage = Math.max(0, this.lastHitEnemyHP) / this.lastHitEnemyMaxHP;
                this.lastHitEnemyBarForeground.width = `${percentage * 100}%`;
                this.lastHitEnemyBarForeground.background = percentage > 0.5 ? "#4caf50" : (percentage > 0.2 ? "#ff9800" : "#f44336");
                this.lastHitEnemyBarBackground.isVisible = true;
                this.lastHitEnemyBarForeground.isVisible = true;
                this.lastHitEnemyLabel.isVisible = true;
            } else {
                this.lastHitEnemyLabel.text = "";
                this.lastHitEnemyBarBackground.isVisible = false;
                this.lastHitEnemyBarForeground.isVisible = false;
                this.lastHitEnemyLabel.isVisible = false;
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
            const validKeys = ["Digit1", "Digit2", "Digit3", "Digit4", "Numpad1", "Numpad2", "Numpad3", "Numpad4"];
            if (validKeys.includes(e.code)) {
                e.preventDefault();
                this.currentWeaponIndex = parseInt(e.code.replace('Digit', '').replace('Numpad', '')) - 1;
                this.updateWeaponUI();
                this.player.switchWeapon(this.weapons[this.currentWeaponIndex]);
            }
        });

        // Damage flash rectangle
        this.damageFlashRect = new Rectangle();
        this.damageFlashRect.width = "100%";
        this.damageFlashRect.height = "100%";
        this.damageFlashRect.background = "rgba(255,0,0,0.35)";
        this.damageFlashRect.thickness = 0;
        this.damageFlashRect.isHitTestVisible = false;
        this.damageFlashRect.alpha = 0;
        advancedTexture.addControl(this.damageFlashRect);

        const crosshair = new TextBlock();
        crosshair.text = "+";
        crosshair.color = "white";
        crosshair.fontSize = 36;
        crosshair.outlineColor = "#000";
        crosshair.outlineWidth = 4;
        crosshair.width = "40px";
        crosshair.height = "40px";
        crosshair.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        crosshair.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        crosshair.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        crosshair.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        crosshair.top = "30px"; // Move crosshair down a little
        advancedTexture.addControl(crosshair);
    }

    private setupWeaponSystem(scene, advancedTexture: AdvancedDynamicTexture): void {
        const weapons = ["basic", "focus", "burst", "rapid"];

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

        // --- Use new stacking inventory ---
        const stacks = this.player.inventory.getItems();
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

            if (stacks[i]) {
                const stack = stacks[i];
                const item = stack.item;
                // Use icon instead of name
                const icon = new Image("itemIcon", `./icons/${item.iconName}`);
                icon.width = "48px";
                icon.height = "48px";
                icon.stretch = Image.STRETCH_UNIFORM;
                icon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
                icon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
                slot.addControl(icon);

                // --- Stack count in bottom right ---
                if (stack.count > 1) {
                    const countText = new TextBlock();
                    countText.text = `x${stack.count}`;
                    countText.color = "#fff";
                    countText.fontSize = 18;
                    countText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
                    countText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
                    countText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
                    countText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
                    countText.paddingRight = "8px";
                    countText.paddingBottom = "4px";
                    slot.addControl(countText);
                }

                let lastClick = 0;
                slot.onPointerUpObservable.add(() => {
                    const now = Date.now();
                    if (now - lastClick < 400) {
                        if (item.use && item.use(this.player)) {
                            // Play select_006.ogg sound
                            const selectAudio = new Audio("./sounds/select_006.ogg");
                            selectAudio.volume = 0.7;
                            selectAudio.play().catch(() => { });
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
            if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.code)) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (e.code === "ArrowRight") {
                col = (col + 1) % 3;
            } else if (e.code === "ArrowLeft") {
                col = (col + 2) % 3;
            } else if (e.code === "ArrowDown") {
                row = (row + 1) % 2;
            } else if (e.code === "ArrowUp") {
                row = (row + 1) % 2;
            } else if (e.code === "Enter") {
                const stack = stacks[this.selectedInventoryIndex];
                if (stack && stack.item.use && stack.item.use(this.player)) {
                    const selectAudio = new Audio("./sounds/select_006.ogg");
                    selectAudio.volume = 0.7;
                    selectAudio.play().catch(() => { });
                    this.player.inventory.removeItem(stack.item.name);
                    this.closeInventory();
                }
            } else if (e.code === "Tab" || e.code === "Escape") {
                this.closeInventory();
                return;
            } else {
                return;
            }
            this.selectedInventoryIndex = row * 3 + col;
            updateHighlight();
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
        notif.outlineColor = "#000";
        notif.outlineWidth = 4;

        // Calculate vertical offset based on number of active notifications
        const index = PlayerView.activeNotifications.length;
        notif.paddingBottom = `${30 + index * PlayerView.NOTIFICATION_SPACING}px`;

        advancedTexture.addControl(notif);

        // Track this notification
        PlayerView.activeNotifications.push(notif);

        setTimeout(() => {
            advancedTexture.dispose();
            // Remove this notification from the list
            const idx = PlayerView.activeNotifications.indexOf(notif);
            if (idx !== -1) {
                PlayerView.activeNotifications.splice(idx, 1);
                // Move up remaining notifications
                for (let i = idx; i < PlayerView.activeNotifications.length; i++) {
                    PlayerView.activeNotifications[i].paddingBottom = `${30 + i * PlayerView.NOTIFICATION_SPACING}px`;
                }
            }
        }, duration);
    }

    public showEnemyHit(name: string, hp: number, maxHp: number = 100): void {
        this.lastHitEnemyName = name;
        this.lastHitEnemyHP = hp;
        this.lastHitEnemyMaxHP = maxHp;
        setTimeout(() => {
            if (this.lastHitEnemyName === name && this.lastHitEnemyHP === hp) {
                this.lastHitEnemyName = null;
                this.lastHitEnemyHP = null;
                this.lastHitEnemyMaxHP = null;
            }
        }, 3000);
    }

    public flashDamage(): void {
        if (!this.damageFlashRect) return;
        this.damageFlashRect.alpha = 1;
        // Fade out over 350ms
        const fadeTime = 350;
        const start = performance.now();
        const animate = (now: number) => {
            const elapsed = now - start;
            const t = Math.min(1, elapsed / fadeTime);
            this.damageFlashRect!.alpha = 1 - t;
            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.damageFlashRect!.alpha = 0;
            }
        };
        requestAnimationFrame(animate);
    }
}
