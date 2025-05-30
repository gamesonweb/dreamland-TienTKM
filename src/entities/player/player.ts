import { Scene, ArcRotateCamera, Vector3, Mesh } from "@babylonjs/core";
import { PlayerController } from "../../controller/playerController";
import { Entity } from "../entity";
import { PlayerView } from "../../view/playerView";
import { RoomModel } from "../../model/roomModel";
import { Environment } from "../../environment";
import { Level } from "../../level";
import { Weapon } from "./weapon";
import { Inventory } from "./inventory";

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

        this._weapon = new Weapon(scene,"pistol",this);
        this.inventory = new Inventory(6);
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

        this._health -= amount;
        console.log(`Player took ${amount} damage! Remaining health: ${this._health}`);

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
}
