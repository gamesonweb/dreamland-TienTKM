import { Scene, ArcRotateCamera, Vector3, Mesh } from "@babylonjs/core";
import { PlayerController } from "../../controller/playerController";
import { Entity } from "../entity";
import { PlayerView } from "../../view/playerView";
import { RoomModel } from "../../model/roomModel";
import { Environment } from "../../environment";
import { Level } from "../../level";
import { Weapon } from "./weapon";
import { Inventory } from "./inventory";

let damageAudio: HTMLAudioElement | null = null;

export class Player extends Entity {
    public controller: PlayerController;
    public view: PlayerView;
    public scene: Scene;
    public room: RoomModel;
    public environment: Environment;
    public inventory: Inventory;
    public _weapon: Weapon;

    public modifiders: [];

    public _health: number = 100;
    public _canTakeDamage: boolean = true;
    public _canTeleport: boolean = true;
    public _canShoot: boolean = true;

    private _mana: number = 100;
    public _maxMana: number = 100;

    public onDeath?: () => void;

    constructor(
        name: string,
        scene: Scene,
        room: RoomModel,
        level: Level
    ) {
        super(name, scene);

        this.controller = new PlayerController("PlayerController", this, scene, room, level);
        this.view = new PlayerView(this, scene);
        this.scene = scene;

        this.controller.initialize();
        this.view._setupCamera();
        this.view._setupHUD();

        this._weapon = new Weapon(scene,"basic",this);
        this.inventory = new Inventory(6);

        // Mana regen loop
        setInterval(() => {
            const bonus = (this as any)["manaRegenBonus"] || 0;
            if (this._mana < this._maxMana) {
                this._mana = Math.min(this._mana + 5 + bonus, this._maxMana);
            }
        }, 1000);
    }

    public update(): void {
        this.controller.update();
        this.view.updateCamera();
    }

    public switchWeapon(weaponName: string): void {
        this._weapon = new Weapon(this.scene, weaponName, this);
    }

    public takeDamage(amount: number): void {
        if (!this._canTakeDamage) return;

        // Play damage sound
        if (!damageAudio) {
            damageAudio = new Audio("./sounds/damage-taken.ogg");
            damageAudio.volume = 0.5;
        }
        damageAudio.currentTime = 0;
        damageAudio.play().catch(() => {});

        this._health -= amount;
        console.log(`Player took ${amount} damage! Remaining health: ${this._health}`);

        // Flash red overlay
        this.view?.flashDamage?.();

        this._canTakeDamage = false;
        setTimeout(() => {
            this._canTakeDamage = true;
        }, 2000);

        if (this._health <= 0 && this.onDeath) {
            this.onDeath();
        }
    }

    public get health(): number {
        return this._health;
    }

    public set health(value: number) {
        this._health = value;
    }

    public get mana(): number {
        return this._mana;
    }

    public set mana(value: number) {
        this._mana = Math.max(0, Math.min(this._maxMana, value));
    }

    public get maxMana(): number {
        return this._maxMana;
    }

    public set maxMana(value: number) {
        this._maxMana = Math.max(100, value);
        this.mana = Math.min(this.mana, this._maxMana); // Ensure mana doesn't exceed max
    }
}
