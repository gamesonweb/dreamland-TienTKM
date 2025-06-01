import {
    Scene,
    Vector3,
    TransformNode,
    Mesh,
} from "@babylonjs/core";
import { Bullet } from "./bullet";
import { InputController } from "../../controller/inputController";
import { Player } from "./player";
import { PlayerController } from "../../controller/playerController";

/**
 * Weapon class for shooting bullets.
 */
export class Weapon {
    public _scene: Scene;
    private _bulletStyle: string;
    public player: Player;

    private _cooldown;
    // private static readonly BULLET_DAMAGE = 30;
    private static readonly basic_DAMAGE = 30;
    private static readonly burst_DAMAGE = 15;
    private static readonly focus_DAMAGE = 100;
    private static readonly rapid_DAMAGE = 10;

    constructor(scene: Scene, bulletStyle: string, player: Player) {
        this._scene = scene;
        this.player = player;
        this._bulletStyle = bulletStyle;
        this._cooldown = 300;
    }

    public _shootBullet(): void {
        this.player._canShoot = false;
        this.shoot(this._bulletStyle);
        setTimeout(() => {
            this.player._canShoot = true;
        }, this._cooldown);
    }

    private shoot(weaponType: string): void {
        switch (weaponType) {
            case "basic":
                this._shootbasic();
                break;
            case "burst":
                if (this.player.mana >= 30) {
                    this.player.mana -= 30;
                    this._shootburst();
                    this._cooldown = 750;
                }
                break;
            case "focus":
                if (this.player.mana >= 20) {
                    this.player.mana -= 20;
                    this._shootfocus();
                    this._cooldown = 1000;
                }
                break;
            case "rapid":
                if (this.player.mana >= 3) {
                    this.player.mana -= 3;
                    this._shootrapid();
                    this._cooldown = 100;
                }
                break;
            default:
                this._shootbasic(); // fallback
                break;
        }
    }

    private _getShootOrigin(): Vector3 {
        const camera = this.player.view.camera;
        const forward = camera.getDirection(Vector3.Forward());
        // Start from the player's position (not the camera)
        const playerPos = this.player._body.transformNode.position;
        // Offset 1 unit in front of the player, in the camera's forward direction
        return playerPos.add(forward.scale(1));
        // const forward = this.player.view.camera.getForwardRay().direction;
        // return this.player._body.transformNode.position.add(forward.scale(1));
    }

    private _getForwardDirection(): Vector3 {
        return this.player.view.camera.getForwardRay().direction;
    }

    /** basicet : tir droit, unique */
    private _shootbasic(): void {
        const origin = this._getShootOrigin();
        const dir = this._getForwardDirection();
        const bonus = (this.player as any)["weaponDamageBonus"]?.basic || 0;
        new Bullet(this._scene, origin, dir, Weapon.basic_DAMAGE + bonus);

        // Play basic sound
        if (!basicAudio) {
            basicAudio = new Audio("./sounds/laserSmall_000.ogg");
            basicAudio.volume = 0.5;
        }
        basicAudio.currentTime = 0;
        basicAudio.play().catch(() => {});
    }

    /** burst : plusieurs projectiles avec dispersion */
    private _shootburst(): void {
        const origin = this._getShootOrigin();
        const baseDir = this._getForwardDirection();
        const spreadAngle = 20; // degrés
        const pellets = 6;
        const bonus = (this.player as any)["weaponDamageBonus"]?.burst || 0;

        for (let i = 0; i < pellets; i++) {
            const dir = this._applySpread(baseDir, spreadAngle);
            new Bullet(this._scene, origin, dir, Weapon.burst_DAMAGE + bonus); // dégâts réduits
        }

        // Play burst sound
        if (!burstAudio) {
            burstAudio = new Audio("./sounds/laserLarge_002.ogg");
            burstAudio.volume = 0.5;
        }
        burstAudio.currentTime = 0;
        burstAudio.play().catch(() => {});
    }

    /** focus : tir unique très précis, dégâts élevés */
    private _shootfocus(): void {
        const origin = this._getShootOrigin();
        const dir = this._getForwardDirection();
        const bonus = (this.player as any)["weaponDamageBonus"]?.focus || 0;
        new Bullet(this._scene, origin, dir, Weapon.focus_DAMAGE + bonus);

        // Play focus sound
        if (!focusAudio) {
            focusAudio = new Audio("./sounds/laserLarge_000.ogg");
            focusAudio.volume = 0.5;
        }
        focusAudio.currentTime = 0;
        focusAudio.play().catch(() => {});
    }

    /** Mitraillette : tir droit mais légèrement imprécis */
    private _shootrapid(): void {
        const origin = this._getShootOrigin();
        const baseDir = this._getForwardDirection();
        const dir = this._applySpread(baseDir, 10); // léger écart
        const bonus = (this.player as any)["weaponDamageBonus"]?.rapid || 0;
        new Bullet(this._scene, origin, dir, Weapon.rapid_DAMAGE + bonus);

        // Play rapid sound
        if (!rapidAudio) {
            rapidAudio = new Audio("./sounds/laserSmall_001.ogg");
            rapidAudio.volume = 0.5;
        }
        rapidAudio.currentTime = 0;
        rapidAudio.play().catch(() => {});
    }

    /**
     * Applique un écart angulaire aléatoire à une direction de tir.
     * @param direction Direction de base
     * @param angleMax Angle maximum de déviation (en degrés)
     */
    private _applySpread(direction: Vector3, angleMax: number): Vector3 {
        const angleRad = (angleMax * Math.PI) / 180;
        const randYaw = (Math.random() - 0.5) * angleRad;
        const randPitch = (Math.random() - 0.5) * angleRad;

        // Convert to quaternion rotation then apply
        const right = Vector3.Cross(direction, Vector3.Up()).normalize();
        const up = Vector3.Cross(right, direction).normalize();

        const spreadDir = direction
            .add(up.scale(Math.tan(randPitch)))
            .add(right.scale(Math.tan(randYaw)))
            .normalize();

        return spreadDir;
    }

}

let basicAudio: HTMLAudioElement | null = null;
let rapidAudio: HTMLAudioElement | null = null;
let focusAudio: HTMLAudioElement | null = null;
let burstAudio: HTMLAudioElement | null = null;
