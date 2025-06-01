import {
    TransformNode,
    Scene,
    MeshBuilder,
    Vector3,
    StandardMaterial,
    Color3,
    PhysicsMotionType,
    Ray,
    Mesh,
    SceneLoader,
    AnimationGroup,
    AbstractMesh,
    Quaternion
} from "@babylonjs/core";

import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";
import "@babylonjs/core/Animations/animatable";

import { InputController } from "./inputController";
import { Bullet } from "../entities/player/bullet";
import { Environment } from "../environment";
import { RoomModel } from "../model/roomModel";
import { Player } from "../entities/player/player";
import { DoorModel } from "../model/doorModel";
import { Level } from "../level";

let moveAudio: HTMLAudioElement | null = null;

export class PlayerController {
    public scene: Scene;
    public input: InputController;
    private isGrounded: boolean = false;
    private isOnSlope: boolean = false;
    public currentRoom: RoomModel | null = null;
    public readonly _level: Level;
    public onDeath?: () => void;
    public assets: { mesh: AbstractMesh; } | null = null;
    public player: Player;
    public rootMesh: Mesh | null = null;
    public animationGroups: AnimationGroup[] = [];

    // Constants
    private static readonly BODY_HEIGHT = 2;
    private static readonly BODY_DIAMETER = 1;
    private static readonly BODY_MASS = 1;
    private static readonly BODY_COLOR = new Color3(1, 0, 0); // Red
    private static readonly BODY_Y_POSITION = 0; // PlayerController.BODY_HEIGHT / 2;
    private static readonly ANGULAR_DAMPING = 1;

    private static readonly JUMP_FORCE = new Vector3(0, 10, 0);
    private static readonly MOVE_FORCE = 10;
    private static readonly MAX_SPEED = 15;
    private static readonly DAMPING_FACTOR = 0.95;
    private static readonly SLOPE_GRAVITY = 9;
    private static readonly SLOPE_ANGLE = Math.PI / 6;
    private static readonly TELEPORT_COOLDOWN_MS = 1000;
    private static readonly RAY_LENGTH = 2;
    private static readonly BULLET_DAMAGE = 30;

    private static readonly SHOOT_COOLDOWN_MS = 300;
    private static readonly DAMAGE_COOLDOWN_MS = 2000;

    private _isMoving: boolean = false;

    constructor(name: string, player: Player, scene: Scene, room: RoomModel, level: Level) {
        this.scene = scene;
        this.input = new InputController(scene);
        this.currentRoom = room;
        this.player = player;
        this._level = level;
    }

    public async initialize(): Promise<void> {
        // Create a root transform node for the player
        const playerRoot = new TransformNode("playerRoot", this.scene);

        // Create a collision mesh (cylinder)
        const collisionMesh = MeshBuilder.CreateCylinder("playerCollision", {
            diameter: PlayerController.BODY_DIAMETER,
            height: PlayerController.BODY_HEIGHT
        }, this.scene);
        collisionMesh.isVisible = false;
        collisionMesh.isPickable = false;
        collisionMesh.position.y = 0; // Adjust to match the player's height

        // Parent the collision mesh to the root node
        collisionMesh.parent = playerRoot;

        // --- REMOVE PLAYER MODEL ---
        // (No SceneLoader.ImportMeshAsync for character-animated.glb)
        // (No mesh parenting or animation setup)

        // Attach the collision mesh to the player entity
        this.player._mesh = collisionMesh;
        this.rootMesh = collisionMesh;
        this.player._initPhysicsMesh(
            collisionMesh,
            PhysicsMotionType.DYNAMIC,
            PlayerController.BODY_MASS,
            PlayerController.ANGULAR_DAMPING
        );
        this._setupCollisionListeners();

        // Set the physics body's transform node to the root node
        this.player._body.transformNode = playerRoot;
        this.player._body.disablePreStep = false;
        this.player._body.transformNode.position.y = 0; // Start at ground level

        // Remove animationGroups and assets setup
        this.assets = null;
        this.animationGroups = [];
    }

    private _setupCollisionListeners(): void {
        const observable = this.player._body.getCollisionObservable();

        observable.add(event => {
            const meta = event.collidedAgainst?.transformNode?.metadata;
            if (!meta) return;

            if (event.type === "COLLISION_STARTED" && meta.isGround) {
                this.isGrounded = true;
                this.isOnSlope = meta.isSlope ?? false;
            } else if (event.type === "COLLISION_FINISHED" && meta.isGround) {
                this.isGrounded = false;
                this.isOnSlope = false;
            }
        });

        observable.add(event => {
            const meta = event.collidedAgainst?.transformNode?.metadata;
            if (event.type === "COLLISION_STARTED" && meta?.isDoor) {

                this._handleDoorCollision(meta.connectedRoom, meta.direction);
            }
        });

        observable.add(event => {
            if (event.type !== "COLLISION_STARTED") return;

            const otherTransform = event.collidedAgainst?.transformNode;
            if (!otherTransform) return;

            const entity = otherTransform.metadata?.entity;
            if (entity && entity._isLethal && entity._isLethalPlayer) {
                const damage = (entity as any).damage ?? 10;
                this.player.takeDamage(damage);
            }
        });
    }

    private _handleDoorCollision(targetRoom: RoomModel, direction: number): void {
        if (!this.player._canTeleport) return;
        // Get the position of the opposite door of the target room with North as 0, South as 1, East as 2 and West as 3
        // Use a switch case to determine the opposite door
        let oppositeDirection: number;
        switch (direction) {
            case DoorModel.NORTH:
                oppositeDirection = DoorModel.SOUTH;
                break;
            case DoorModel.SOUTH:
                oppositeDirection = DoorModel.NORTH;
                break;
            case DoorModel.EAST:
                oppositeDirection = DoorModel.WEST;
                break;
            case DoorModel.WEST:
                oppositeDirection = DoorModel.EAST;
                break;
            default:
                console.warn("Invalid door direction");
                return;
        }
        const oppositeDoor = targetRoom.getDoor(oppositeDirection as 0 | 1 | 2 | 3);
        // Get a clone of the door position
        const doorPosition = oppositeDoor?.position.clone() ?? Vector3.Zero();
        // Offset the door position depending on the direction to be slightly into the room so the player doesn't get stuck
        const offset = 2;
        switch (direction) {
            case DoorModel.NORTH:
                doorPosition.z -= offset;
                break;
            case DoorModel.SOUTH:
                doorPosition.z += offset;
                break;
            case DoorModel.EAST:
                doorPosition.x += offset;
                break;
            case DoorModel.WEST:
                doorPosition.x -= offset;
                break;
        }
        doorPosition.y += PlayerController.BODY_Y_POSITION;
        if (this.currentRoom.isCompleted()) {
            // Play door close sound when leaving the room
            const doorCloseAudio = new Audio("./sounds/doorClose_2.ogg");
            doorCloseAudio.volume = 0.7;
            doorCloseAudio.play().catch(() => {});

            this._teleportToRoom(targetRoom, this._level, doorPosition);
            this.player._canTeleport = false;

            // Make player invulnerable for 200ms after teleporting
            this.player._canTakeDamage = false;
            setTimeout(() => {
                this.player._canTakeDamage = true;
            }, 200);

            setTimeout(() => {
                this.player._canTeleport = true;
            }, PlayerController.TELEPORT_COOLDOWN_MS);
        }
    }

    private _teleportToRoom(room: RoomModel, level: Level, doorPosition: Vector3): void {
        this.player._body.disablePreStep = false;
        this.player._body.transformNode.position.copyFrom(doorPosition);

        level.playerEnterRoom(room);
        this.currentRoom = room;
        // Trigger minimap update
        this.player.view?.updateMinimap();
    }

    public update(): void {
        if (!this.player._body) {
            console.warn("PlayerController body is not initialized yet.");
            return;
        }
        this.input.update();
        this._checkIfOnSlope();

        const moveDir = new Vector3(this.input.horizontal, 0, this.input.vertical);

        // --- Play muted move sound when moving and grounded ---
        if (moveDir.length() > 0.1 && this.isGrounded) {
            if (!this._isMoving) {
                this._isMoving = true;
                if (!moveAudio) {
                    moveAudio = new Audio("./sounds/move.ogg");
                    moveAudio.loop = true;
                    moveAudio.volume = 0.08; // Very muted
                }
                moveAudio.currentTime = 0;
                moveAudio.play().catch(() => {});
            }
        } else {
            if (this._isMoving) {
                this._isMoving = false;
                if (moveAudio) {
                    moveAudio.pause();
                    moveAudio.currentTime = 0;
                }
            }
        }

        if (moveDir.length() > 0 && this.player._body?._pluginData) {
            this._applyMovement(moveDir);
        } else if (this.player._body?._pluginData) {
            this._dampenVelocity();
        }

        if (this.player._body?._pluginData && this.isOnSlope) {
            const counterForce = PlayerController.SLOPE_GRAVITY * Math.sin(PlayerController.SLOPE_ANGLE);
            this.player._body.applyForce(new Vector3(0, counterForce, 0), this.player._body.getObjectCenterWorld());
        }

        if (this.input.jump && this.isGrounded) {
            this.player._body.applyImpulse(PlayerController.JUMP_FORCE, this.player._body.getObjectCenterWorld());
            this.isGrounded = false;
        }

        if (this.player._body?._pluginData) {
            this.player._body.setAngularVelocity(Vector3.Zero());
        }

        if (this.player._canShoot && this.input.shoot) {
            // this.input.shoot = false;
            this.player._weapon._shootBullet();
        }
        // --- Character model rotation to face camera direction ---
        if (this.assets?.mesh && this.player.view?.camera) {
            // Get the camera's forward direction, ignore Y
            const camForward = this.player.view.camera.getForwardRay().direction.clone();
            camForward.y = 0;
            camForward.normalize();

            // If the direction is valid, rotate the mesh
            if (camForward.lengthSquared() > 0.0001) {
                // Babylon's FromLookDirectionLH expects forward and up
                const targetQuat = Quaternion.FromLookDirectionLH(camForward, Vector3.Up());
                this.assets.mesh.rotationQuaternion = Quaternion.Slerp(
                    this.assets.mesh.rotationQuaternion ?? Quaternion.Identity(),
                    targetQuat,
                    0.2 // Smoothing factor, adjust as needed
                );
            }
        }
    }

    private _applyMovement(direction: Vector3): void {
        direction.normalize();

        const camForward = this.player.view.camera.getForwardRay().direction;
        camForward.y = 0;
        camForward.normalize();

        const camRight = Vector3.Cross(camForward, Vector3.Up()).normalize();
        const camRelative = camForward.scale(direction.z).add(camRight.scale(-direction.x)).normalize();

        const force = camRelative.scale(PlayerController.MOVE_FORCE);
        this.player._body.applyForce(force, this.player._body.getObjectCenterWorld());

        const velocity = this.player._body.getLinearVelocity();
        if (velocity.length() > PlayerController.MAX_SPEED) {
            this.player._body.setLinearVelocity(velocity.normalize().scale(PlayerController.MAX_SPEED));
        }
    }

    protected _dampenVelocity(): void {
        const velocity = this.player._body.getLinearVelocity();
        const damped = new Vector3(
            velocity.x * PlayerController.DAMPING_FACTOR,
            velocity.y,
            velocity.z * PlayerController.DAMPING_FACTOR
        );
        this.player._body.setLinearVelocity(this.isOnSlope ? Vector3.Zero() : damped);
    }

    private _checkIfOnSlope(): void {
        const directions = [
            new Vector3(0, -1, 0),
            new Vector3(0.5, -1, 0),
            new Vector3(-0.5, -1, 0),
            new Vector3(0, -1, 0.5),
            new Vector3(0, -1, -0.5),
        ];

        this.isOnSlope = directions.some(dir => {
            const ray = new Ray(this.player._body.getObjectCenterWorld(), dir, PlayerController.RAY_LENGTH);
            const hit = this.scene.pickWithRay(ray, m => m.metadata?.isGround);
            return hit?.pickedMesh?.metadata?.isSlope;
        });
    }

    public get position(): Vector3 {
        return this.player._body?.transformNode?.position.clone() ?? Vector3.Zero();
    }

    public set position(position: Vector3) {
        this.player._body.transformNode.position = position;
    }

    /*
    private async _loadCharacterAssets(scene: Scene): Promise<void> {
        async function loadCharacter(): Promise<{ mesh: Mesh; animationGroups: AnimationGroup[] }> {
            // Create a collision mesh (invisible box)
            const outer = MeshBuilder.CreateBox("outer", { width: 2, depth: 1, height: 3 }, scene);
            outer.isVisible = false;
            outer.isPickable = false;
            outer.checkCollisions = true;

            // Move the origin of the box collider to the bottom of the mesh
            outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

            // Configure collision ellipsoid
            outer.ellipsoid = new Vector3(1, 1.5, 1);
            outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

            // Rotate the player mesh 180 degrees to face the correct direction
            outer.rotationQuaternion = new Quaternion(0, 1, 0, 0);

            // Import the player model
            return SceneLoader.ImportMeshAsync(null, "./models/", "character-human.glb", scene).then((result) => {
                const root = result.meshes[0];
                const body = root; // The main player mesh
                body.parent = outer;
                body.isPickable = false;

                // Disable picking for all child meshes
                body.getChildMeshes().forEach((m) => {
                    m.isPickable = false;
                });

                // Return the collision mesh and animation groups
                return {
                    mesh: outer,
                    animationGroups: result.animationGroups,
                };
            });
        }

        // Load the character and store the assets
        return loadCharacter().then((assets) => {
            this.assets = assets;
        });
    }
    */
}