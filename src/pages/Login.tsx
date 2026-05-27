import { useState } from 'react'
import { Box, Button, FormControl, Input, InputLabel } from '@mui/material';
import { api } from '../utils/api';
import { user as u } from '../signals/signals';
import { useAtom } from 'jotai';
import axios from 'axios';

function Login() {

    const [form, setForm] = useState({
        username: '',
        password: ''
    })
    const [localView, setLocalView] = useState('login')
    const [user, setUser] = useAtom(u)
    const handleChange = ({target: { id, value}}: any) => {
        setForm({
            ...form,
            [id]: value
        })
    }
    const [error, setError] = useState('')
    const [isError, setIsError] = useState(false)

    const register = async () => {
        try {
            const params = {
                username: form.username,
                password: form.password
            }
            await api.post(`/register`, params)
            setLocalView('login')/*
            await trailerApi.register(form.username, form.password)
            setLocalView('login')*/
        } catch(error: unknown) {
            let message = 'Something went wrong during login'
            if (axios.isAxiosError(error)) {
                message = 
                    error.response?.data?.message || 
                    error.response?.data ||
                    error.message
            } else if (error instanceof Error) {
                message = error.message
            }

            setError(message)
            setIsError(true)
            console.log(error)
        }
    }

    const login = async () => {
        try {
            const params = {
                username: form.username,
                password: form.password
            }
            const res = await api.post(`/login`, params)
            setUser({
                email: res.data.user.username,
                accessToken: res.data.token,
                refreshToken: res.data.refresh_token,
                role: res.data.user.role
            })
            console.log(user)
            /*
            const res = await trailerApi.login(form.username, form.password)
            setUser({
                email: res.user.email,
                id: res.user.id,
                accessToken: res.accessToken,
                refreshToken: res.refreshToken,
                role: res.user.role
            })*/
        } catch(error: unknown) {
            let message = 'Something went wrong during login'
            if (axios.isAxiosError(error)) {
                message = 
                    error.response?.data?.message || 
                    error.response?.data ||
                    error.message
            } else if (error instanceof Error) {
                message = error.message
            }

            setError(message)
            setIsError(true)
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
                <div style={{
                    display: 'flex',
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '5%'
                }}>
                    <Button variant='contained' color='success' onClick={() => login()}>Login</Button>
                    <Button variant='contained' color='error' onClick={() => setLocalView('register')}>Register</Button>
                </div>
                {
                    isError && <p style={{ color: 'red', marginTop: '5%' }}>{error}</p>
                }
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