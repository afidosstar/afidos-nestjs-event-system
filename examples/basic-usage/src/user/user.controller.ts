import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    async createUser(@Body() createUserDto: CreateUserDto) {
        const user = await this.userService.createUser(createUserDto);
        return {
            message: 'User created successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
        };
    }

    @Get()
    async getAllUsers() {
        const users = await this.userService.getAllUsers();
        return {
            users: users.map(user => ({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                createdAt: user.createdAt,
            })),
        };
    }

    @Get(':id')
    async getUserById(@Param('id', ParseIntPipe) id: number) {
        const user = await this.userService.findById(id);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                createdAt: user.createdAt,
            },
        };
    }

    @Post(':id/password-reset')
    async requestPasswordReset(@Param('id', ParseIntPipe) id: number) {
        const user = await this.userService.findById(id);
        await this.userService.requestPasswordReset(user.email);

        return {
            message: 'Password reset email sent successfully',
        };
    }
}
