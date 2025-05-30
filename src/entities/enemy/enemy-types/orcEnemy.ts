import { SceneLoader, Vector3, Quaternion, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Scene } from "@babylonjs/core";
import { Enemy } from "../enemy";
import { Player } from "../../player/player";

export class OrcEnemy extends Enemy {
    private _orcModel: any;
    private _state: "walk" | "chargeup" | "charge" = "walk";
    private _chargeTimer: number = 0;
    private _chargeDuration: number = 1.2;
    private _chargeupTime: number = 0.7;
    private _chargeDirection: Vector3 = Vector3.Zero();
    private _chargeSpeed: number = 18;
    private _walkSpeed: number = 3;
    private _friction: number = 0.93; // For slowing down after charge
    public override threatLevel: number = 2;

    constructor(scene: Scene, player: Player, spawnPosition: Vector3) {
        super("orc", scene, player, spawnPosition, 15, 120);
        this._initVisual();
        this._isActive = true;
    }


    private _initVisual(): void {
        SceneLoader.ImportMeshAsync(null, "./models/", "character-orc.glb", this._scene).then((result) => {
            const orcModel = result.meshes[0];
            orcModel.name = "orcVisual";
            orcModel.parent = this._mesh;
            orcModel.isPickable = false;
            orcModel.scaling = new Vector3(1, 1, 1);
            orcModel.position = new Vector3(0, 0, 0); // Center on 
            this._orcModel = orcModel;

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
                if (dist < 3) {
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
    }
}