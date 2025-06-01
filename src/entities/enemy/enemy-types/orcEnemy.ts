import { SceneLoader, Vector3, Quaternion, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Scene } from "@babylonjs/core";
import { Enemy } from "../enemy";
import { Player } from "../../player/player";
import { WeaponDamageItem } from "../../player/itemTypes/weaponDamageItem"; // Add this import

export class OrcEnemy extends Enemy {
    private _orcModel: any;
    private _state: "walk" | "chargeup" | "charge" = "walk";
    private _chargeTimer: number = 0;
    private _chargeDuration: number = 5;
    private _chargeupTime: number = 0.7;
    private _chargeDirection: Vector3 = Vector3.Zero();
    private _chargeSpeed: number = 18;
    private _walkSpeed: number = 3;
    private _friction: number = 0.99; // For slowing down after charge
    public override threatLevel: number = 2;

    constructor(scene: Scene, player: Player, spawnPosition: Vector3) {
        super("orc", scene, player, spawnPosition, 15, 160);
        this._initVisual();
        this._isActive = true;
    }


    private _initVisual(): void {
        SceneLoader.ImportMeshAsync(null, "./models/", "Orc.glb", this._scene).then((result) => {
            const orcModel = result.meshes[0];
            orcModel.name = "orcVisual";
            orcModel.parent = this._mesh;
            orcModel.isPickable = false;
            orcModel.scaling = new Vector3(1, 1, 1);
            orcModel.position = new Vector3(0, -1, 0); // Center on 
            this._orcModel = orcModel;

            this._mesh.isVisible = false; // Hide the main mesh, use the orc model instead

            // Optionally play idle/walk animation
            if (result.animationGroups && result.animationGroups.length > 0) {
                const walkAnim = result.animationGroups.find(
                    (anim) => anim.name.toLowerCase().includes("walk")
                );
                if (walkAnim) {
                    result.animationGroups.forEach(anim => anim.stop());
                    walkAnim.start(true, 1.0, walkAnim.from, walkAnim.to);
                }
            }
        });
    }

    public override update(): void {
        if (!this._isActive || !this._body) return;

        const enemyPos = this.position;
        const playerPos = this._player.position;
        const toPlayer = playerPos.subtract(enemyPos);
        toPlayer.y = 0;
        const dist = toPlayer.length();

        switch (this._state) {
            case "walk":
                if (dist < 13) {
                    this._state = "chargeup";
                    this._chargeTimer = 0;
                } else {
                    // Walk toward player
                    const velocity = toPlayer.normalize().scale(this._walkSpeed);
                    this._body.setLinearVelocity(velocity);
                }
                break;
            case "chargeup":
                this._chargeTimer += this._scene.getEngine().getDeltaTime() / 1000;
                // Optionally: play charge-up animation or effect here
                if (this._chargeTimer >= this._chargeupTime) {
                    this._state = "charge";
                    this._chargeTimer = 0;
                    this._chargeDirection = toPlayer.normalize();
                    // Set initial charge velocity
                    this._body.setLinearVelocity(this._chargeDirection.scale(this._chargeSpeed));
                } else {
                    // Stand still during chargeup
                    this._body.setLinearVelocity(Vector3.Zero());
                }
                break;
            case "charge":
                // Apply friction to slow down
                let currentVel = this._body.getLinearVelocity();
                currentVel = currentVel.scale(this._friction);
                this._body.setLinearVelocity(currentVel);

                this._chargeTimer += this._scene.getEngine().getDeltaTime() / 1000;
                if (this._chargeTimer >= this._chargeDuration || currentVel.length() < 1) {
                    this._state = "walk";
                    this._chargeTimer = 0;
                }
                break;
        }

        // --- Make the model face the way it's moving ---
        if (this._orcModel && this._body) {
            const velocity = this._body.getLinearVelocity();
            // Only update if moving significantly
            if (velocity.lengthSquared() > 0.01) {
                // Ignore Y for horizontal facing
                const dir = new Vector3(velocity.x, 0, velocity.z);
                if (dir.lengthSquared() > 0.001) {
                    const angle = Math.atan2(dir.x, dir.z); // Babylon uses Y-up, so x/z
                    this._orcModel.rotationQuaternion = Quaternion.FromEulerAngles(0, angle, 0);
                }
            }
        }

        // --- Keep the model upright ---
        if (this._mesh && this._mesh.rotationQuaternion) {
            // Zero out X and Z rotation, keep Y (facing direction)
            const yRot = this._mesh.rotationQuaternion.toEulerAngles().y;
            this._mesh.rotationQuaternion = Quaternion.FromEulerAngles(0, yRot, 0);
        } else if (this._mesh) {
            this._mesh.rotation.x = 0;
            this._mesh.rotation.z = 0;
        }

        // --- Prevent collision sphere from rolling ---
        if (this._body) {
            this._body.setAngularVelocity(Vector3.Zero());
            this._body.setAngularDamping(999);
        }
    }

    public override takeDamage(amount: number): void {
        this.health -= amount;
        if (this._player?.view?.showEnemyHit) {
            this._player.view.showEnemyHit(this.name, this.health, this.maxHealth ?? 100);
        }
        if (this.health <= 0) {
            this._onOrcDeathReward();
            this._die();
        }
    }

    // Give a random damage up item to the player on orc death
    private _onOrcDeathReward(): void {
        const weaponTypes = ["basic", "focus", "burst", "rapid"] as const;
        const randomType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
        const item = new WeaponDamageItem(this._scene, randomType);
        this._player.inventory.addItem(item);
        if (this._player.view?.showNotification) {
            this._player.view.showNotification(
                `You gained a ${randomType} damage up!`,
                "#4caf50",
                6000
            );
        }
    }
}