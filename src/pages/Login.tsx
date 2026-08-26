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
    const [, setUser] = useAtom(u)
    const handleChange = ({target: { id, value}}: any) => {
        setForm({
            ...form,
            [id]: value
        })
    }
    const [error, setError] = useState('')
    const [isError, setIsError] = useState(false)

    const login = async () => {
        try {
            const params = {
                username: form.username,
                password: form.password
            }
            const res = await api.post(`/api/login`, params)
            setUser({
                email: res.data.user.username,
                role: res.data.user.role
            })
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

    return(
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <Box className='container' onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') login() }}>
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
                    width: '30%',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: '5%',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    textAlign: 'center'
                }}>
                    <Button variant='contained' color='success' onClick={() => login()}>Login</Button>
                </div>
                {isError && <p style={{ color: 'red', marginTop: '5%' }}>{error}</p>}
            </Box>
        </div>
    )
}

export default Login
