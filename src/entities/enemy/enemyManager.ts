import { Mesh, Scene, Vector3 } from "@babylonjs/core";
import { Enemy } from "./enemy";
import { Player } from "../player/player";
import { RoomModel } from "../../model/roomModel";
import { SlimeEnemy } from "./enemy-types/slimeEnemy";
import { OrcEnemy } from "./enemy-types/orcEnemy";
import { ShockwaveEnemy } from "./enemy-types/shockWaveEnemy"
import { HealingItem } from "../player/itemTypes/healingItem";

type EnemyType = "slime" | "orc" | "shockWave"; // Add more types as needed

const ENEMY_TYPES: EnemyType[] = [
    "slime",
    "orc",
    "shockWave",
    // Add more types here
];

export class EnemyManager {
    private readonly _scene: Scene;
    private readonly _player: Player;
    private _enemies: Enemy[] = [];
    public threatRating: number = 1;


    constructor(scene: Scene, player: Player) {
        this._scene = scene;
        this._player = player;
    }

    // Call this to spawn enemies matching the current threat rating
    public async spawnEnemiesForThreat(room: RoomModel): Promise<void> {
        let remainingThreat = this.threatRating;
        const chosenEnemies: Enemy[] = [];
        const MAX_ENEMIES = 10;

        while (remainingThreat > 0 && chosenEnemies.length < MAX_ENEMIES) {
            // Pick a random enemy type
            const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
            const spawnPos = this._getRandomSpawnPosition(room);

            let enemy: Enemy;
            let threatLevel = 1;

            // Track if a ShockwaveEnemy has already been chosen for this room
            let shockwaveSpawned = chosenEnemies.some(e => e instanceof ShockwaveEnemy);

            switch (type) {
                case "slime":
                    enemy = new SlimeEnemy(this._scene, this._player, spawnPos);
                    threatLevel = enemy.threatLevel;
                    break;

                case "shockWave":
                    if (remainingThreat > 3) {
                        enemy = new ShockwaveEnemy(this._scene, this._player, spawnPos);
                        threatLevel = enemy.threatLevel;
                        break;
                    }
                    continue;
                case "orc":
                    if (remainingThreat > 2) {
                        enemy = new OrcEnemy(this._scene, this._player, spawnPos);
                        threatLevel = enemy.threatLevel;
                        break;
                    }
                    continue;
                // Add more cases for other enemy types
                default:
                    console.warn(`Unknown enemy type: ${type}`);
                    continue;
            }

            // if (threatLevel > remainingThreat) continue;

            chosenEnemies.push(enemy);
            remainingThreat -= threatLevel;
        }

        // Add them to the manager (or scene) as needed
        for (const enemy of chosenEnemies) {
            this._enemies.push(enemy);
        }

        this.threatRating += 1;
        console.log(`Spawned ${chosenEnemies.length} enemies for threat rating ${this.threatRating}`);
    }

    public spawnEnemies(
        room: RoomModel,
        amount: number,
        aiBehavior?: (enemy: Enemy, player: Player) => void
    ): void {
        for (let i = 0; i < amount; i++) {
            const spawnPos = this._getRandomSpawnPosition(room);

            const enemy = new Enemy(`enemy_${i}`, this._scene, this._player, spawnPos, 20, 100);
            aiBehavior && enemy.setAIBehavior(aiBehavior);
            this._enemies.push(enemy);
        }
    }

    private _getRandomSpawnPosition(room: RoomModel): Vector3 {
        const floor = this._scene.meshes.find(m =>
            m.metadata?.isGround && m.name === `${room.name}_floor`
        ) as Mesh;

        if (!floor) {
            console.warn(`Floor mesh not found for room ${room.name}`);
            return this._manualSpawnPosition(room);
        }

        const bbox = floor.getBoundingInfo().boundingBox;
        const min = bbox.minimumWorld;
        const max = bbox.maximumWorld;

        // Keep at least 2 units away from each wall
        const margin = 2;
        const x = Math.random() * ((max.x - margin) - (min.x + margin)) + (min.x + margin);
        const z = Math.random() * ((max.z - margin) - (min.z + margin)) + (min.z + margin);
        const y = max.y + 0.5;

        console.log(`Spawn enemy at (x=${x.toFixed(2)}, y=${y.toFixed(2)}, z=${z.toFixed(2)})`);
        return new Vector3(x, y, z);
    }

    private _manualSpawnPosition(room: RoomModel): Vector3 {
        const y = room.position.y + 1;
        const margin = 2;
        const minX = room.position.x + margin;
        const maxX = room.position.x + room.size.x - margin;
        const minZ = room.position.z + margin;
        const maxZ = room.position.z + room.size.z - margin;
        const x = Math.random() * (maxX - minX) + minX;
        const z = Math.random() * (maxZ - minZ) + minZ;
        return new Vector3(x, y, z);
    }


    public updateEnemies(): void {
        this._enemies.forEach((enemy) => enemy.update());
        this._enemies = this._enemies.filter(enemy => enemy._isActive);

        if (this.countEnemies() == 0) {
            const currentRoom = this._player.controller.currentRoom;
            if (currentRoom && !currentRoom._itemGiven) {
                currentRoom._itemGiven = true;
                this._player.controller.player.inventory.addItem(new HealingItem(this._scene));
                // Show notification
                this._player.view.showNotification("Healing Potion Awarded");
            }
            this._player.controller.currentRoom.setToCompleted();
        }
    }

    public toggleAllEnemies(): void {
        this._enemies.forEach((enemy) => enemy.toggleActiveState());
    }

    public clearEnemies(): void {
        this._enemies.forEach((enemy) => enemy.dispose());
        this._enemies = [];
    }

    public countEnemies(): number {
        return this._enemies.filter(enemy => enemy._isActive).length;
    }
}
