import {
    MeshBuilder,
    StandardMaterial,
    Color3,
    Vector3,
    Scene,
    IPhysicsCollisionEvent
} from "@babylonjs/core";
import { Entity } from "../entity";
import { Player } from "../player/player"; // Or wherever the Player class is

export class Enemy extends Entity {
    public readonly _speed: number = 4;
    public readonly _maxSpeed: number = 5;
    public readonly _player: Player;
    public _isActive: boolean = false;
    public _aiBehavior: (enemy: Enemy, player: Player) => void;
    public maxHealth: number;
    public health: number;
    public damage: number;
    public readonly threatLevel: number = 1;

    constructor(name: string, scene: Scene, player: Player, spawnPosition: Vector3, damage: number, health: number) {
        super(name, scene);
        this._player = player;
        this._aiBehavior = this._defaultBehavior.bind(this);
        this._initialize(spawnPosition);
        this._isLethal = true;
        this._isLethalPlayer = true; // Enemies can damage players
        this.damage = damage;
        this.health = health;
        this.maxHealth = health; // Set max health to initial health
    }

    private _initialize(spawnPosition: Vector3): void {
        this._mesh = MeshBuilder.CreateSphere("enemyBody", { diameter: 2 }, this._scene);
        this._mesh.position = spawnPosition.clone().add(new Vector3(0, 1, 0));
        this._mesh.parent = this;
        this._mesh.metadata = { entity: this };

        const material = new StandardMaterial("enemyMaterial", this._scene);
        material.diffuseColor = new Color3(0, 0, 1);
        this._mesh.material = material;

        this._initPhysicsAggregate(this._mesh, 1);

        this._body?.setCollisionCallbackEnabled(true);

        this._body?.getCollisionObservable()?.add((event: IPhysicsCollisionEvent) => {
            if (event.type !== "COLLISION_STARTED") return;

            const otherTransform = event.collidedAgainst?.transformNode;
            if (!otherTransform) return;

            const entity = otherTransform.metadata?.entity;
            if (entity && entity._isLethal && entity._isLethalEnemy) {
                console.log(`Enemy ${this.name} collided with lethal entity ${entity.name}`);
                const damage = (entity as any).damage ?? 10;
                this.takeDamage(damage);
            }
        });
    }

    public update(): void {
        if (!this._isActive || !this._body) return;

        // --- Kill enemy if out of bounds ---
        if (this.position.y < -20) {
            this.health = 0;
            this._die();
            return;
        }

        this._aiBehavior(this, this._player);
    }

    private _defaultBehavior(enemy: Enemy, player: Player): void {
        const enemyPos = enemy.position;
        const playerPos = player.position;

        const direction = playerPos.subtract(enemyPos);
        direction.y = 0;
        const distance = direction.length();

        if (distance < 0.1) return;

        const velocity = direction.normalize().scale(this._speed);
        this._body.setLinearVelocity(velocity);

        this._clampVelocity(this._maxSpeed);
    }

    public toggleActiveState(): void {
        this._isActive = !this._isActive;
        console.log(`Enemy ${this.name} is now ${this._isActive ? "active" : "inactive"}`);
    }

    public setAIBehavior(behavior: (enemy: Enemy, player: Player) => void): void {
        this._aiBehavior = behavior;
    }

    public takeDamage(amount: number): void {
        this.health -= amount;
        console.log(`${this.name} took ${amount} damage, health now ${this.health}`);
        // Show enemy HP in HUD
        if (this._player?.view?.showEnemyHit) {
            this._player.view.showEnemyHit(this.name, this.health, this.maxHealth ?? 100);
        }
        if (this.health <= 0) {
            this._die();
        }
    }

    protected _die(): void {
        this._isActive = false;
        this._mesh.setEnabled(false); // Cache le mesh
        this._body.setLinearVelocity(Vector3.Zero()); // Arrête le mouvement
        // Turn off collision
        this._body.setCollisionCallbackEnabled(false);
        this._isLethal = false; // Disable lethality
        console.log(`${this.name} has died`);
    }
}
