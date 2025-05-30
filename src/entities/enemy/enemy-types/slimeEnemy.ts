import { SceneLoader, Vector3, Quaternion } from "@babylonjs/core";
import { Enemy } from "../enemy";

export class SlimeEnemy extends Enemy {
    private _bounceTimer: number = 0;
    private _bounceInterval: number = 1.5;
    private _bounceStrength: number = 10;
    public override threatLevel: number = 0.5;
    private _slimeModel: any;

    constructor(scene, player, spawnPosition) {
        super("slime", scene, player, spawnPosition, 5, 30);
        this._initVisual();
        this._isActive = true;
    }

    private _initVisual(): void {
        SceneLoader.ImportMeshAsync(null, "./models/", "PSlime.glb", this._scene).then((result) => {
            const slimeModel = result.meshes[0];
            slimeModel.name = "slimeVisual";
            slimeModel.parent = this._mesh;
            slimeModel.isPickable = false;
            slimeModel.scaling = new Vector3(0.01, 0.01, 0.01);
            slimeModel.position = new Vector3(0, 0, -1);
            this._mesh.isVisible = false;
            this._slimeModel = slimeModel;

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

        // Bouncing logic
        this._bounceTimer += this._scene.getEngine().getDeltaTime() / 1000;
        if (this._bounceTimer >= this._bounceInterval) {
            this._bounceTimer = 0;
            const direction = this._player.position.subtract(this.position);
            direction.y = 0;
            direction.normalize();
            const bounceVelocity = direction.scale(1.5).add(new Vector3(0, this._bounceStrength, 0));
            this._body.setLinearVelocity(bounceVelocity);
        }
    }
}