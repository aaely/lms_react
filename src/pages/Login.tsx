import { useState } from 'react'
import { Box, Button, FormControl, Input, InputLabel } from '@mui/material';
//import { api } from '../utils/api';
import { user as u } from '../signals/signals';
import { trailerApi } from '../../netlify/functions/trailerApi';
import { useAtom } from 'jotai';

function Login() {

    const [form, setForm] = useState({
        username: '',
        password: ''
    })
    const [localView, setLocalView] = useState('login')
    const [, setUser] = useAtom(u)
    const handleChange = ({target: { id, value}}: any) => {
        setForm({
            ...form,
            [id]: value
        })
    }

    const register = async () => {
        try {
            /*const params = {
                username: form.username,
                password: form.password
            }
            await api.post(`/register`, params)
            setLocalView('login')*/
            await trailerApi.register(form.username, form.password)
            setLocalView('login')
        } catch(error) {
            console.log(error)
        }
    }

    const login = async () => {
        try {
            /*const params = {
                username: form.username,
                password: form.password
            }
            const res = await api.post(`/login`, params)
            setToken(res.data.token)
            setRole(res.data.user.role)*/
            const res = await trailerApi.login(form.username, form.password)
            setUser({
                email: res.user.email,
                id: res.user.id,
                accessToken: res.accessToken,
                refreshToken: res.refreshToken,
                role: res.user.role
            })
        } catch(error) {
            console.log(error)
        }
    }

    const renderRegistration = () => {
        return(
            <Box className='container'>
                <h1>Register</h1>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Username</InputLabel>
                    <Input
                    id='username'
                    type='text'
                    value={form.username}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Password</InputLabel>
                    <Input
                    id='password'
                    type='password'
                    value={form.password}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                <Button variant='contained' color='success' onClick={() => register()}>Set Details</Button>
                <Button variant='contained' color='error' onClick={() => setLocalView('login')}>Login</Button>
            </Box>
        )
    }

    const renderLogin = () => {
        return(
            <Box className='container'>
                <h1>Login</h1>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Username</InputLabel>
                    <Input
                    id='username'
                    type='text'
                    value={form.username}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Password</InputLabel>
                    <Input
                    id='password'
                    type='password'
                    value={form.password}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                <Button variant='contained' color='success' onClick={() => login()}>Login</Button>
                <Button variant='contained' color='error' onClick={() => setLocalView('register')}>Register</Button>
            </Box>
        )
    }


    return(
        <div>
            {localView === 'register' ? renderRegistration() : renderLogin()}
        </div>
    )
}

export default Login