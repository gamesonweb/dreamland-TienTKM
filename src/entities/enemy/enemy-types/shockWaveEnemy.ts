import { SceneLoader, Vector3, MeshBuilder, StandardMaterial, Color3, Mesh, Scene } from "@babylonjs/core";
import { Enemy } from "../enemy";
import { MaxManaItem } from "../../player/itemTypes/maxManaItem";
import { ManaRegenItem } from "../../player/itemTypes/manaRegenItem"; // Add this import

export class ShockwaveEnemy extends Enemy {
    private _shockwaveCooldown: number = 0;
    private _shockwaveInterval: number = 4 + Math.random();
    private _shockwaveSpeed: number = 20;
    private _shockwaveMaxRadius: number = 100;
    private _shockwaveRadius: number = 1;
    private _jumpStrength: number = 10;
    private _currentShockwave: Mesh | null = null;
    private _showwaveDamage: number = 20;
    public override threatLevel: number = 3;
    private _model: any;

    constructor(scene: Scene, player: any, spawnPosition: Vector3) {
        super("Heavy Slime", scene, player, spawnPosition, 5, 200);
        this._initVisual();
        this._isActive = true;

        // Increase hitbox size by scaling the mesh BEFORE physics impostor/body is created
        if (this._mesh?.scaling) {
            this._mesh.scaling = this._mesh.scaling.multiplyByFloats(1.3, 1.3, 1.3);
        }
    }

    private _initVisual(): void {
        SceneLoader.ImportMeshAsync(null, "./models/", "BigSlime.glb", this._scene).then((result) => {
            const model = result.meshes[0];
            model.name = "shockwaveVisual";
            model.parent = this._mesh;
            model.isPickable = false;
            model.scaling = new Vector3(0.013, 0.013, 0.013); // 0.01 * 1.3
            model.position = new Vector3(0, 0, -1);
            this._mesh.isVisible = false;
            this._model = model;
        });
    }

    private _createShockwave(radius: number): void {
        // Supprime l'ancien shockwave
        if (this._currentShockwave) {
            this._currentShockwave.dispose();
            this._currentShockwave = null;
        }

        const thickness = 0.3; // épaisseur fixe du tube

        const wave = MeshBuilder.CreateTorus("shockwave", {
            diameter: radius * 2,    // diamètre du grand cercle
            thickness: thickness,
            tessellation: 128,
            sideOrientation: Mesh.DOUBLESIDE
        }, this._scene);

        wave.position = this.position.clone();
        wave.position.y = 0.1; // juste au-dessus du sol

        const mat = new StandardMaterial("shockwaveMat", this._scene);
        mat.diffuseColor = new Color3(1, 0.4, 0);   // rouge orangé
        mat.emissiveColor = new Color3(1, 0.3, 0);
        mat.alpha = 0.7;
        mat.backFaceCulling = false;
        mat.specularPower = 64;
        wave.material = mat;

        this._currentShockwave = wave;
    }

    public override update(): void {
        if (!this._isActive || !this._body){
            this.dispose();   
            return;
        }

        const deltaTime = this._scene.getEngine().getDeltaTime() / 1000;
        this._shockwaveCooldown += deltaTime;

        if (this._shockwaveCooldown >= this._shockwaveInterval) {
            this._shockwaveCooldown = 0;
            this._shockwaveInterval = 2 + Math.random();

            this._shockwaveRadius = 1; // reset radius à la création
            this._body.setLinearVelocity(new Vector3(0, this._jumpStrength, 0));
            this._createShockwave(this._shockwaveRadius);
        }

        if (this._currentShockwave) {
            this._shockwaveRadius += deltaTime * this._shockwaveSpeed;

            // Met à jour le tore avec le nouveau diamètre (grand cercle)
            this._createShockwave(this._shockwaveRadius);

            // Gestion de la transparence avec un effet de fondu quadratique
            const progress = Math.min(1, this._shockwaveRadius / this._shockwaveMaxRadius);
            this._currentShockwave.material.alpha = 0.7 * (1 - progress * progress);

            // **Collision simple avec le joueur**
            const playerPos = this._player.position;
            const shockwaveCenter = this._currentShockwave.position;

            // Distance horizontale joueur <-> centre onde
            const distXZ = Math.sqrt(
                (playerPos.x - shockwaveCenter.x) ** 2 +
                (playerPos.z - shockwaveCenter.z) ** 2
            );

            const thickness = 0.3; // épaisseur du tube, même valeur que dans _createShockwave

            // Collision si le joueur est dans l’anneau du tore (rayon ± moitié épaisseur)
            const minDist = this._shockwaveRadius - thickness / 2;
            const maxDist = this._shockwaveRadius + thickness / 2;

            // On vérifie aussi la hauteur du joueur (peut ajuster tolérance)
            const playerHeight = playerPos.y;
            const waveHeight = shockwaveCenter.y;

            if (distXZ >= minDist && distXZ <= maxDist && Math.abs(playerHeight - waveHeight) < 1) {
                // Le joueur est touché par l'onde
                this._player.takeDamage(this._showwaveDamage); // ou la méthode de dégâts de ton joueur
            }

            if (this._shockwaveRadius > this._shockwaveMaxRadius) {
                this._currentShockwave.dispose();
                this._currentShockwave = null;
            }
        }
    }

    public override takeDamage(amount: number): void {
        this.health -= amount;
        if (this._player?.view?.showEnemyHit) {
            this._player.view.showEnemyHit(this.name, this.health, this.maxHealth ?? 100);
        }
        if (this.health <= 0) {
            this._onShockwaveDeathReward();
            this._die();
        }
    }

    // Give a MaxManaItem or ManaRegenItem to the player on death (50/50 chance)
    private _onShockwaveDeathReward(): void {
        let item;
        if (Math.random() < 0.5) {
            item = new MaxManaItem(this._scene);
            this._player.inventory.addItem(item);
            if (this._player.view?.showNotification) {
                this._player.view.showNotification(
                    "You gained a max mana upgrade!",
                    "#2196f3",
                    6000
                );
            }
        } else {
            item = new ManaRegenItem(this._scene);
            this._player.inventory.addItem(item);
            if (this._player.view?.showNotification) {
                this._player.view.showNotification(
                    "You gained a mana regen upgrade!",
                    "#4cafef",
                    6000
                );
            }
        }
    }

    public dispose(): void {
        console.log(`Disposing ShockwaveEnemy ${this.name}`);
        if (this._currentShockwave) {
            this._currentShockwave.dispose();
            this._currentShockwave = null;
        }
        super.dispose();
    }
}